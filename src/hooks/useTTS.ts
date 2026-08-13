import { setAudioModeAsync } from 'expo-audio';
import { useAtomValue } from 'jotai';
import { useCallback, useEffect, useRef } from 'react';
import { TransportType } from '~/@types/graphql';
import { isRemoteTTSEnabled } from '~/lib/remoteConfig';
import speechState, { resetFirstSpeechAtom } from '../store/atoms/speech';
import { arrivedAtom, selectedBoundAtom } from '../store/atoms/station';
import { computeSuppressionDecision } from '../utils/computeSuppressionDecision';
import type { SpeechEngineRequest } from './tts/speechEngine';
import { useNativeSpeechEngine } from './tts/useNativeSpeechEngine';
import { useRemoteSpeechEngine } from './tts/useRemoteSpeechEngine';
import { useCurrentLine } from './useCurrentLine';
import { usePrevious } from './usePrevious';
import { useStoppingState } from './useStoppingState';
import { useTTSText } from './useTTSText';

// 発話開始後に完了・失敗の通知が一切届かない場合の安全タイムアウト（ミリ秒）。
// 端末内蔵の TTS エンジンは音声フォーカス喪失や中断時にコールバックを落とすこと
// があり、リモート TTS も取得と再生の双方でハングしうる。その場合に playingRef が
// 解放されず以降の TTS 全体が停止するのを防ぐ。正常な発話（日英合わせても数十秒
// 程度、リモートは取得時間を含めても十分収まる）はこの時間内に必ず完了する。
const PLAYBACK_TIMEOUT_MS = 300_000;

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

  // 端末内蔵 TTS はリモート合成を使わない構成での常用経路であり、リモート合成が
  // 使えないときのフォールバックも担うため、どちらのプラットフォームでも用意しておく。
  const nativeEngine = useNativeSpeechEngine();
  const remoteEngine = useRemoteSpeechEngine();

  const stopAllEngines = useCallback(() => {
    remoteEngine.stop();
    nativeEngine.stop();
  }, [nativeEngine, remoteEngine]);

  // アンマウント時のクリーンアップから参照する。エンジンの識別子を effect の
  // 依存に入れると、識別子が変わっただけでクリーンアップが走って発話中の
  // アナウンスを打ち切ってしまうため、ref 経由で最新の実装を呼ぶ。
  const stopAllEnginesRef = useRef(stopAllEngines);
  stopAllEnginesRef.current = stopAllEngines;

  // OS ネイティブ TTS は expo-audio のプレイヤーを使わないが、iOS の
  // AVSpeechSynthesizer はアプリの音声セッションを共有するため、
  // サイレントスイッチ中の読み上げ・バックグラウンド再生はここで設定した
  // audio mode に従う。リモート TTS の再生（expo-audio）も同じセッションを使う。
  // 他アプリ音声のダッキングは発話開始直前にのみ有効化し
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

  // 発話開始時に安全タイムアウトを張る。TTS エンジンから完了・エラー・停止の
  // いずれの通知も届かないままハングした場合でも、playingRef を確実に解放して
  // 以降の発話が詰まらないようにする。
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
        stopAllEngines();
        finishPlaying();
      }, PLAYBACK_TIMEOUT_MS);
    },
    [finishPlaying, stopAllEngines]
  );

  const speechWithText = useCallback(
    (ja: string, en: string) => {
      if (!ja.length || !en.length || !isLoadableRef.current) {
        return;
      }

      // 発話の世代IDを同期的に採番して再生中フラグを立てる。ここを非同期に
      // すると同一テキストで二重に発話が走りうる。音声セッション設定などの
      // 非同期処理後は isStaleRun で世代を確認し、古い継続を破棄する
      const runId = speechRunIdRef.current + 1;
      speechRunIdRef.current = runId;
      playingRef.current = true;
      armPlaybackWatchdog(runId);

      const isStaleRun = () =>
        speechRunIdRef.current !== runId ||
        !playingRef.current ||
        !isLoadableRef.current;

      const request: SpeechEngineRequest = {
        ssmlJa: ja,
        ssmlEn: en,
        speakJa: shouldSpeakJapanese,
        speakEn: shouldSpeakEnglish,
      };

      const onSpeechStarted = () => {
        if (firstSpeechRef.current) {
          firstSpeechRef.current = false;
          suppressPostFirstSpeechRef.current = true;
        }
      };

      const onSettled = () => {
        if (isStaleRun()) {
          return;
        }
        finishPlaying();
      };

      void (async () => {
        // 実際に読み上げる直前にのみ他アプリ音声のダッキングを有効化する
        await setDuckingActiveAsync(true);
        if (isStaleRun()) {
          // このrunは既に無効化されている（タイムアウトやアンマウントで
          // 別経路がクリーンアップ済み）。直前で張ったダッキングだけ解除する
          void setDuckingActiveAsync(false);
          return;
        }

        // 読み上げ直前に Remote Config を引き、リモート合成(Worker 経由の
        // gpt-4o-mini-tts)と端末内蔵 TTS のどちらで読み上げるかを決める。起動後に
        // 設定が届いた場合も次の放送から反映される。
        if (!isRemoteTTSEnabled()) {
          nativeEngine.speak(request, { onSpeechStarted, onSettled });
          return;
        }

        remoteEngine.speak(request, {
          onSpeechStarted,
          onSettled,
          // 圏外・トンネル・API 障害で合成できなかった回は、その放送だけ
          // 端末内蔵 TTS で読み上げてアナウンスの欠落を防ぐ
          onUnavailable: () => {
            if (isStaleRun()) {
              return;
            }
            console.warn(
              '[useTTS] Remote TTS unavailable, falling back to on-device TTS'
            );
            nativeEngine.speak(request, { onSpeechStarted, onSettled });
          },
        });
      })();
    },
    [
      armPlaybackWatchdog,
      finishPlaying,
      nativeEngine,
      remoteEngine,
      setDuckingActiveAsync,
      shouldSpeakEnglish,
      shouldSpeakJapanese,
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
      stopAllEnginesRef.current();
      playingRef.current = false;
      // 発話中にアンマウントされた場合、ダッキングが張られたまま残るのを防ぐ
      void setDuckingActiveAsync(false);
    };
  }, [setDuckingActiveAsync]);
};
