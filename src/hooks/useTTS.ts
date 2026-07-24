import { setAudioModeAsync } from 'expo-audio';
import * as Speech from 'expo-speech';
import { useAtomValue } from 'jotai';
import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { TransportType } from '~/@types/graphql';
import speechState, { resetFirstSpeechAtom } from '../store/atoms/speech';
import { arrivedAtom, selectedBoundAtom } from '../store/atoms/station';
import { computeSuppressionDecision } from '../utils/computeSuppressionDecision';
import { selectBestVoiceIdentifier } from '../utils/nativeTtsVoice';
import {
  containsJapaneseCharacters,
  stripJapaneseCharacters,
} from '../utils/phoneme';
import { ssmlToPlainText } from '../utils/ssmlToPlainText';
import { useCurrentLine } from './useCurrentLine';
import { usePrevious } from './usePrevious';
import { useStoppingState } from './useStoppingState';
import { useTTSText } from './useTTSText';

// 発話開始後に onDone / onError / onStopped が一切届かない場合の安全タイムアウト（ミリ秒）。
// Android の TTS エンジンは音声フォーカス喪失や中断時にコールバックを落とすことがあり、
// その場合に playingRef が解放されず以降の TTS 全体が停止するのを防ぐ。
// 正常な発話（日英合わせても数十秒程度）はこの時間内に必ず完了する。
const PLAYBACK_TIMEOUT_MS = 300_000;

const JA_SPEECH_LANGUAGE = 'ja-JP';
const EN_SPEECH_LANGUAGE = 'en-US';

// expo-speech は volume 未指定時の既定値が機種・OSバージョンにより最大音量
// より低くなることがあるため、常に最大値を明示指定して音量が下がる余地を無くす。
const MAX_SPEECH_VOLUME = 1.0;

// 発話開始前に音声選択（getAvailableVoicesAsync）の完了を待つ上限（ミリ秒）。
// Android の TTS エンジン初期化がハングした場合でも、この時間を超えたら
// 音声未指定のまま発話へ進み、アナウンス全体が止まらないようにする。
const VOICES_READY_TIMEOUT_MS = 5_000;

// Android の TextToSpeech は入力長上限 (通常 4000 文字) を超えると発話自体が
// 失敗する。通常のアナウンス文はこの上限に達しないが、超過時は静かに失敗する
// より切り詰めて読み上げる方がマシなため防衛的に丸める。
const truncateToSpeechLimit = (text: string): string => {
  const limit = Speech.maxSpeechInputLength;
  if (typeof limit === 'number' && limit > 0 && text.length > limit) {
    return text.slice(0, limit);
  }
  return text;
};

export const useTTS = (): void => {
  const { enabled, backgroundEnabled, ttsEnabledLanguages } =
    useAtomValue(speechState);
  const arrived = useAtomValue(arrivedAtom);
  const selectedBound = useAtomValue(selectedBoundAtom);
  const currentLine = useCurrentLine();
  const stoppingState = useStoppingState();
  const prevStoppingState = usePrevious(stoppingState);

  const firstSpeechRef = useRef(true);
  const resetFirstSpeech = useAtomValue(resetFirstSpeechAtom);
  const prevResetFirstSpeechRef = useRef(resetFirstSpeech);
  // useTTSTextがfirstSpeechRef.currentを読む前に同期的に更新する
  // useEffectだとレンダー後に実行されるため、通常テキストが先に生成・再生されてしまう
  if (resetFirstSpeech !== prevResetFirstSpeechRef.current) {
    prevResetFirstSpeechRef.current = resetFirstSpeech;
    firstSpeechRef.current = true;
  }
  // 行先選択直後の初回TTSを抑止し、発車後（arrived=false）でのみ解放する
  const suppressFirstSpeechUntilDepartureRef = useRef(false);
  const prevSelectedBoundIdRef = useRef<string | number | null>(null);
  // 初回放送後にfirstSpeechRef変更で生じるテキスト変化を無視するフラグ
  const suppressPostFirstSpeechRef = useRef(false);
  const playingRef = useRef(false);
  // 発話ごとに採番する世代ID。タイムアウトや停止で無効化された古い発話の
  // コールバックが、後続の発話の再生状態を壊すのを防ぐ
  const speechRunIdRef = useRef(0);
  const isLoadableRef = useRef(true);
  const pendingRef = useRef<{ textJa: string; textEn: string } | null>(null);
  const speechWithTextRef = useRef<((ja: string, en: string) => void) | null>(
    null
  );
  const isBus = currentLine?.transportType === TransportType.Bus;
  const ttsResult = useTTSText(firstSpeechRef.current, enabled, isBus);
  const ttsText = ttsResult.text;
  const [prevTextJa, prevTextEn] = usePrevious(ttsText);
  const [textJa, textEn] = ttsText;
  const shouldSpeakJapanese = ttsEnabledLanguages.includes('JA');
  const shouldSpeakEnglish = ttsEnabledLanguages.includes('EN');

  const playingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 言語ごとに端末の最高品質音声（premium / enhanced）を明示指定するための識別子。
  // 見つからない場合は undefined のままシステム既定音声に任せる。
  const jaVoiceIdRef = useRef<string | undefined>(undefined);
  const enVoiceIdRef = useRef<string | undefined>(undefined);
  // Android で音声一覧の取得に成功した（=言語ごとの音声有無を判定できる）か。
  // expo-speech の Android 実装は対象言語の音声データが端末に無いと setLanguage
  // が LANG_MISSING_DATA となり端末既定言語にフォールバックするため、音声が
  // 見つからなかった言語の発話はスキップする判断に使う。
  const androidVoicesLoadedRef = useRef(false);

  // 初回発話が音声選択の完了前に走ると voice 未指定で合成されてしまうため、
  // 発話側が選択完了を待てるよう Promise を保持する（常に resolve する）。
  const voicesReadyRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    let cancelled = false;
    voicesReadyRef.current = (async () => {
      try {
        const voices = await Speech.getAvailableVoicesAsync();
        if (cancelled) {
          return;
        }
        // Android は voice 未指定だと言語フォールバック不備の影響を受けるため、
        // 高品質音声が無くても既定品質のローカル音声を明示指定する
        const options = { allowDefaultQuality: Platform.OS === 'android' };
        jaVoiceIdRef.current = selectBestVoiceIdentifier(
          voices,
          JA_SPEECH_LANGUAGE,
          options
        );
        enVoiceIdRef.current = selectBestVoiceIdentifier(
          voices,
          EN_SPEECH_LANGUAGE,
          options
        );
        if (Platform.OS === 'android' && voices.length > 0) {
          androidVoicesLoadedRef.current = true;
          if (!jaVoiceIdRef.current) {
            console.warn(
              '[useTTS] No Japanese voice found on this device; Japanese announcements will be skipped'
            );
          }
          if (!enVoiceIdRef.current) {
            console.warn(
              '[useTTS] No English voice found on this device; English announcements will be skipped'
            );
          }
        }
      } catch (e) {
        console.warn('[useTTS] getAvailableVoicesAsync failed:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 音声選択の完了を待つ。取得がハングしても発話全体が止まらないよう上限付き
  const waitForVoicesReady = useCallback(async () => {
    const ready = voicesReadyRef.current;
    if (!ready) {
      return;
    }
    await Promise.race([
      ready,
      new Promise<void>((resolve) => {
        setTimeout(resolve, VOICES_READY_TIMEOUT_MS);
      }),
    ]);
  }, []);

  // OS ネイティブ TTS は expo-audio のプレイヤーを使わないが、iOS の
  // AVSpeechSynthesizer はアプリの音声セッションを共有するため、
  // サイレントスイッチ中の読み上げ・バックグラウンド再生はここで設定した
  // audio mode に従う。他アプリ音声のダッキングは発話開始直前にのみ有効化し
  // （setDuckingActiveAsync 参照）、ここでは非ダッキング状態を既定にする。
  const backgroundEnabledRef = useRef(backgroundEnabled);
  backgroundEnabledRef.current = backgroundEnabled;
  // 直近に要求したダッキング状態。backgroundEnabled 変更時の再設定で
  // 発話中のダッキングを誤って mixWithOthers に巻き戻さないよう保持する
  const duckingActiveRef = useRef(false);

  const applyAudioModeAsync = useCallback(
    async (duck: boolean, shouldPlayInBackground: boolean) => {
      try {
        await setAudioModeAsync({
          allowsRecording: false,
          shouldPlayInBackground,
          interruptionMode: duck ? 'duckOthers' : 'mixWithOthers',
          playsInSilentMode: true,
          interruptionModeAndroid: duck ? 'duckOthers' : 'mixWithOthers',
          shouldRouteThroughEarpiece: false,
        });
      } catch (e) {
        console.warn('[useTTS] setAudioModeAsync failed:', e);
      }
    },
    []
  );

  useEffect(() => {
    // backgroundEnabled の変更を反映する際も、発話中なら現在のダッキング
    // 状態（duckingActiveRef）を維持したまま再設定する
    void applyAudioModeAsync(duckingActiveRef.current, backgroundEnabled);
  }, [backgroundEnabled, applyAudioModeAsync]);

  // 発話中だけ他アプリ音声をダッキングし、完了後は mixWithOthers へ戻す。
  // duckOthers を張ったままにすると、AVAudioSession は再生停止後も
  // 他アプリの音量を復元しないことがあり、ダッキングが残存し続けるため、
  // interruptionMode 自体を切り替えて明示的に解除する。
  const setDuckingActiveAsync = useCallback(
    async (duck: boolean) => {
      duckingActiveRef.current = duck;
      await applyAudioModeAsync(duck, backgroundEnabledRef.current);
    },
    [applyAudioModeAsync]
  );

  // playingRefのリセットとpending処理を一元化してデッドロックを防止
  const finishPlaying = useCallback(() => {
    playingRef.current = false;
    if (playingTimeoutRef.current) {
      clearTimeout(playingTimeoutRef.current);
      playingTimeoutRef.current = null;
    }
    const pending = pendingRef.current;
    if (pending) {
      pendingRef.current = null;
      speechWithTextRef.current?.(pending.textJa, pending.textEn);
    } else {
      // 後続の発話が控えていない場合のみ解除する。pending がある場合は
      // 直後に再度発話が始まりダッキングを再度張るため、解除は不要。
      void setDuckingActiveAsync(false);
    }
  }, [setDuckingActiveAsync]);

  // 発話開始時に安全タイムアウトを張る。OS の TTS エンジンから完了・エラー・
  // 停止のいずれのコールバックも届かないままハングした場合でも、playingRef を
  // 確実に解放して以降の発話が詰まらないようにする。
  const armPlaybackWatchdog = useCallback(
    (runId: number) => {
      if (playingTimeoutRef.current) {
        clearTimeout(playingTimeoutRef.current);
      }
      playingTimeoutRef.current = setTimeout(() => {
        if (!playingRef.current || speechRunIdRef.current !== runId) {
          return;
        }
        console.warn(
          '[useTTS] Playback safety timeout reached, force resetting'
        );
        // 世代を進めて、強制リセット後に古い発話のコールバックが
        // 再生状態へ割り込むのを無効化する
        speechRunIdRef.current += 1;
        try {
          Speech.stop();
        } catch {}
        finishPlaying();
      }, PLAYBACK_TIMEOUT_MS);
    },
    [finishPlaying]
  );

  const speechWithText = useCallback(
    (ja: string, en: string) => {
      if (!ja.length || !en.length || !isLoadableRef.current) {
        return;
      }

      // 発話の世代IDを同期的に採番して再生中フラグを立てる。ここを非同期に
      // すると同一テキストで二重に発話が走りうる。音声選択の完了待ちなどの
      // 非同期処理後は isStaleRun で世代を確認し、古い継続を破棄する
      const runId = speechRunIdRef.current + 1;
      speechRunIdRef.current = runId;
      playingRef.current = true;
      armPlaybackWatchdog(runId);

      const isStaleRun = () =>
        speechRunIdRef.current !== runId ||
        !playingRef.current ||
        !isLoadableRef.current;

      void (async () => {
        // 初回アナウンスが音声選択の完了前に走ると voice 未指定で合成され、
        // Android では言語フォールバック不備により端末既定言語（日本語）で
        // 英語文が読まれうる。選択完了を待ってから発話する
        await waitForVoicesReady();
        if (isStaleRun()) {
          return;
        }

        // Android で端末に対象言語の音声が1つも無い場合、expo-speech の
        // setLanguage が LANG_MISSING_DATA で端末既定言語にフォールバックし、
        // 英語文が日本語音声で合成されてしまう。誤った言語の音声で読み上げる
        // より、その言語の発話をスキップする方がマシなため発話対象から外す。
        const voicesKnown = androidVoicesLoadedRef.current;
        const canSpeakJa = !voicesKnown || Boolean(jaVoiceIdRef.current);
        const canSpeakEn = !voicesKnown || Boolean(enVoiceIdRef.current);

        // テンプレートが生成する SSML 断片を OS ネイティブ TTS 用の
        // プレーンテキストへ変換する。英語はテンプレ側に区切りのカンマが
        // 既に含まれるため <break/> は空白へ置き換える。
        const plainJa =
          shouldSpeakJapanese && canSpeakJa
            ? truncateToSpeechLimit(
                ssmlToPlainText(ja, { breakReplacement: '、' })
              )
            : '';
        let plainEn =
          shouldSpeakEnglish && canSpeakEn
            ? truncateToSpeechLimit(
                ssmlToPlainText(en, { breakReplacement: ' ' })
              )
            : '';
        // nameRoman が欠落した駅データ等では wrapPhoneme のローマ字フォール
        // バックが効かず、英語文に日本語が残ることがある。日本語が混じった
        // 英語文は voice を明示指定していても TTS エンジンが言語を誤判定して
        // 全文を日本語音声で合成してしまうため、最終防衛線として除去する
        if (containsJapaneseCharacters(plainEn)) {
          console.warn(
            '[useTTS] English text contains Japanese characters, stripping:',
            plainEn
          );
          plainEn = stripJapaneseCharacters(plainEn);
        }

        const utterances = [
          plainJa
            ? {
                text: plainJa,
                language: JA_SPEECH_LANGUAGE,
                voice: jaVoiceIdRef.current,
              }
            : null,
          plainEn
            ? {
                text: plainEn,
                language: EN_SPEECH_LANGUAGE,
                voice: enVoiceIdRef.current,
              }
            : null,
        ].filter(
          (
            u
          ): u is {
            text: string;
            language: string;
            voice: string | undefined;
          } => u !== null
        );

        if (!utterances.length) {
          finishPlaying();
          return;
        }

        // 実際に読み上げる直前にのみ他アプリ音声のダッキングを有効化する
        await setDuckingActiveAsync(true);
        if (isStaleRun()) {
          // このrunは既に無効化されている（タイムアウトやアンマウントで
          // 別経路がクリーンアップ済み）。直前で張ったダッキングだけ解除する
          void setDuckingActiveAsync(false);
          return;
        }

        if (firstSpeechRef.current) {
          firstSpeechRef.current = false;
          suppressPostFirstSpeechRef.current = true;
        }

        // JA→EN を一括で OS の読み上げキューへ積む。Android の TextToSpeech は
        // speak() 呼び出し時点の言語・音声設定を発話リクエストごとにスナップ
        // ショットする（setVoice / setLanguage は mParams に保存され speak() が
        // 要求ごとに複製する）ため、発話ごとに異なる音声を安全に指定できる。
        // iOS の AVSpeechUtterance も発話単位で音声を保持する。一括で積むことで
        // エンジンが前の発話の再生中に次の合成を先行でき、発話間の無音
        // （合成待ちのラグ）を最小化する。完了・エラー・停止のいずれかが全発話
        // 分そろった時点でパイプラインを解放する。タイムアウトや新規発話で
        // 世代が進んでいたら、古いコールバックは無視する
        let remaining = utterances.length;
        const settle = () => {
          if (isStaleRun()) {
            return;
          }
          remaining -= 1;
          if (remaining <= 0) {
            finishPlaying();
          }
        };
        for (const utterance of utterances) {
          Speech.speak(utterance.text, {
            language: utterance.language,
            volume: MAX_SPEECH_VOLUME,
            ...(utterance.voice ? { voice: utterance.voice } : {}),
            onDone: settle,
            onStopped: settle,
            onError: (error) => {
              console.warn('[useTTS] speech error:', error);
              settle();
            },
          });
        }
      })();
    },
    [
      armPlaybackWatchdog,
      finishPlaying,
      setDuckingActiveAsync,
      shouldSpeakEnglish,
      shouldSpeakJapanese,
      waitForVoicesReady,
    ]
  );

  speechWithTextRef.current = speechWithText;

  useEffect(() => {
    const currentSelectedBoundId = selectedBound?.id ?? null;
    const hasSelectedBoundChanged =
      currentSelectedBoundId !== prevSelectedBoundIdRef.current;

    // 初回かつ行先変更時のみ、停車中の初回読み上げをスキップ対象にする
    if (firstSpeechRef.current && hasSelectedBoundChanged && selectedBound) {
      suppressFirstSpeechUntilDepartureRef.current = true;
    }

    prevSelectedBoundIdRef.current = currentSelectedBoundId;
  }, [selectedBound]);

  useEffect(() => {
    if (!enabled || (prevTextJa === textJa && prevTextEn === textEn)) {
      return;
    }

    if (!textJa || !textEn) {
      pendingRef.current = null;
      return;
    }

    if (
      computeSuppressionDecision({
        suppressPostFirstSpeechRef,
        firstSpeechRef,
        suppressFirstSpeechUntilDepartureRef,
        arrived,
        stoppingStateChanged: stoppingState !== prevStoppingState,
      })
    ) {
      return;
    }

    // 再生中なら最新のテキストをpendingに記録して完了時にトリガー
    if (playingRef.current) {
      console.warn('[useTTS] Already playing, queuing text as pending');
      pendingRef.current = { textJa, textEn };
      return;
    }

    pendingRef.current = null;
    speechWithTextRef.current?.(textJa, textEn);
  }, [
    arrived,
    enabled,
    prevStoppingState,
    prevTextEn,
    prevTextJa,
    stoppingState,
    textEn,
    textJa,
  ]);

  useEffect(() => {
    // StrictMode の開発時アンマウント→再マウントでも発話可能な状態へ戻す
    isLoadableRef.current = true;
    return () => {
      isLoadableRef.current = false;
      pendingRef.current = null;
      if (playingTimeoutRef.current) {
        clearTimeout(playingTimeoutRef.current);
        playingTimeoutRef.current = null;
      }
      // 世代を進めて残存コールバックを無効化してから読み上げを停止する
      speechRunIdRef.current += 1;
      try {
        Speech.stop();
      } catch {}
      playingRef.current = false;
      // 発話中にアンマウントされた場合、ダッキングが張られたまま残るのを防ぐ
      void setDuckingActiveAsync(false);
    };
  }, [setDuckingActiveAsync]);
};
