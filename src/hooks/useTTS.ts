import { setAudioModeAsync } from 'expo-audio';
import * as Speech from 'expo-speech';
import { useAtomValue } from 'jotai';
import { useCallback, useEffect, useRef } from 'react';
import { TransportType } from '~/@types/graphql';
import speechState, { resetFirstSpeechAtom } from '../store/atoms/speech';
import { arrivedAtom, selectedBoundAtom } from '../store/atoms/station';
import { computeSuppressionDecision } from '../utils/computeSuppressionDecision';
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

  // OS ネイティブ TTS は expo-audio のプレイヤーを使わないが、iOS の
  // AVSpeechSynthesizer はアプリの音声セッションを共有するため、
  // サイレントスイッチ中の読み上げ・バックグラウンド再生・他アプリ音声の
  // ダッキングはここで設定した audio mode に従う。
  useEffect(() => {
    (async () => {
      try {
        await setAudioModeAsync({
          allowsRecording: false,
          shouldPlayInBackground: backgroundEnabled,
          interruptionMode: 'duckOthers',
          playsInSilentMode: true,
          interruptionModeAndroid: 'duckOthers',
          shouldRouteThroughEarpiece: false,
        });
      } catch (e) {
        console.warn('[useTTS] setAudioModeAsync failed:', e);
      }
    })();
  }, [backgroundEnabled]);

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
    }
  }, []);

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

      // テンプレートが生成する SSML 断片を OS ネイティブ TTS 用の
      // プレーンテキストへ変換する。英語はテンプレ側に区切りのカンマが
      // 既に含まれるため <break/> は空白へ置き換える。
      const plainJa = shouldSpeakJapanese
        ? truncateToSpeechLimit(ssmlToPlainText(ja, { breakReplacement: '、' }))
        : '';
      const plainEn = shouldSpeakEnglish
        ? truncateToSpeechLimit(ssmlToPlainText(en, { breakReplacement: ' ' }))
        : '';

      const utterances = [
        plainJa ? { text: plainJa, language: JA_SPEECH_LANGUAGE } : null,
        plainEn ? { text: plainEn, language: EN_SPEECH_LANGUAGE } : null,
      ].filter((u): u is { text: string; language: string } => u !== null);

      if (!utterances.length) {
        finishPlaying();
        return;
      }

      if (firstSpeechRef.current) {
        firstSpeechRef.current = false;
        suppressPostFirstSpeechRef.current = true;
      }

      const runId = speechRunIdRef.current + 1;
      speechRunIdRef.current = runId;
      playingRef.current = true;
      armPlaybackWatchdog(runId);

      // 全発話が完了（またはエラー・停止）した時点で再生パイプラインを解放する。
      // タイムアウトや新規発話で世代が進んでいたら、古いコールバックは無視する
      let remaining = utterances.length;
      const settle = () => {
        if (speechRunIdRef.current !== runId || !playingRef.current) {
          return;
        }
        remaining -= 1;
        if (remaining <= 0) {
          finishPlaying();
        }
      };

      // expo-speech は追加順に逐次読み上げるため、JA→EN の順でキューへ積む
      for (const utterance of utterances) {
        Speech.speak(utterance.text, {
          language: utterance.language,
          onDone: settle,
          onStopped: settle,
          onError: (error) => {
            console.warn('[useTTS] speech error:', error);
            settle();
          },
        });
      }
    },
    [
      armPlaybackWatchdog,
      finishPlaying,
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
      try {
        Speech.stop();
      } catch {}
      playingRef.current = false;
    };
  }, []);
};
