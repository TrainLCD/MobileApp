import AsyncStorage from '@react-native-async-storage/async-storage';
import { getIdToken } from '@react-native-firebase/auth';
import { setAudioModeAsync } from 'expo-audio';
import { useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { DEV_TTS_API_URL, PRODUCTION_TTS_API_URL } from 'react-native-dotenv';
import { TransportType } from '~/@types/graphql';
import { ASYNC_STORAGE_KEYS } from '../constants';
import speechState from '../store/atoms/speech';
import stationState from '../store/atoms/station';
import tuningState from '../store/atoms/tuning';
import { computeSuppressionDecision } from '../utils/computeSuppressionDecision';
import { isDevApp } from '../utils/isDevApp';
import {
  type PlayAudioHandle,
  playAudio,
  safeRemoveListener,
  safeRemovePlayer,
} from '../utils/ttsAudioPlayer';
import { fetchSpeechAudio } from '../utils/ttsSpeechFetcher';
import { useBusTTSText } from './useBusTTSText';
import { useCachedInitAnonymousUser } from './useCachedAnonymousUser';
import { useCurrentLine } from './useCurrentLine';
import { usePrevious } from './usePrevious';
import { useStoppingState } from './useStoppingState';
import { useTTSText } from './useTTSText';

// 再生が完了しない場合のフォールバックタイムアウト（ミリ秒）
const PLAYBACK_TIMEOUT_MS = 60_000;

// 日本語再生完了後に英語プレイヤーを生成するまでのディレイ（ミリ秒）
// ネイティブ音声セッションが安定するまで待機し、英語再生の開始失敗を防ぐ
const EN_PLAYBACK_DELAY_MS = 100;

export const useTTS = (): void => {
  const { enabled, backgroundEnabled, ttsEnabledLanguages } =
    useAtomValue(speechState);
  const { arrived, selectedBound } = useAtomValue(stationState);
  const { ttsJaVoiceName, ttsEnVoiceName } = useAtomValue(tuningState);
  const setTuning = useSetAtom(tuningState);
  const currentLine = useCurrentLine();
  const stoppingState = useStoppingState();
  const prevStoppingState = usePrevious(stoppingState);

  const firstSpeechRef = useRef(true);
  // 行先選択直後の初回TTSを抑止し、発車後（arrived=false）でのみ解放する
  const suppressFirstSpeechUntilDepartureRef = useRef(false);
  const prevSelectedBoundIdRef = useRef<string | number | null>(null);
  // 初回放送後にfirstSpeechRef変更で生じるテキスト変化を無視するフラグ
  const suppressPostFirstSpeechRef = useRef(false);
  const playingRef = useRef(false);
  const isLoadableRef = useRef(true);
  const pendingRef = useRef<{ textJa: string; textEn: string } | null>(null);
  // 最後にTTS再生を実行（または再生キューに追加）したテキストを保持する。
  // usePreviousと異なり、抑制やスキップされたテキストでは更新されないため、
  // 再訪駅でテキスト変更が「消費」されてTTSが発火しなくなる問題を防ぐ。
  const lastTriggeredTextRef = useRef<[string, string] | null>(null);
  const speechWithTextRef = useRef<
    ((ja: string, en: string) => Promise<void>) | null
  >(null);
  const trainTTSResult = useTTSText(firstSpeechRef.current, enabled);
  const busTTSResult = useBusTTSText(firstSpeechRef.current, enabled);
  const ttsResult =
    currentLine?.transportType === TransportType.Bus
      ? busTTSResult
      : trainTTSResult;
  const ttsText = ttsResult.text;
  const prefetchText = ttsResult.nextText;
  const [textJa, textEn] = ttsText;
  const [prefetchJa, prefetchEn] = prefetchText.length
    ? prefetchText
    : [undefined, undefined];
  const shouldSpeakJapanese = ttsEnabledLanguages.includes('JA');
  const shouldSpeakEnglish = ttsEnabledLanguages.includes('EN');

  const user = useCachedInitAnonymousUser();

  const jaHandleRef = useRef<PlayAudioHandle | null>(null);
  const enHandleRef = useRef<PlayAudioHandle | null>(null);
  const playingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanupAllPlayers = useCallback(() => {
    safeRemoveListener(jaHandleRef.current?.listener ?? null);
    safeRemoveListener(enHandleRef.current?.listener ?? null);
    safeRemovePlayer(jaHandleRef.current?.player ?? null);
    safeRemovePlayer(enHandleRef.current?.player ?? null);
    jaHandleRef.current = null;
    enHandleRef.current = null;
  }, []);

  useEffect(() => {
    (async () => {
      const [jaVoice, enVoice] = await Promise.all([
        AsyncStorage.getItem(ASYNC_STORAGE_KEYS.TTS_JA_VOICE_NAME),
        AsyncStorage.getItem(ASYNC_STORAGE_KEYS.TTS_EN_VOICE_NAME),
      ]);
      setTuning((prev) => ({
        ...prev,
        ttsJaVoiceName: jaVoice ?? '',
        ttsEnVoiceName: enVoice ?? '',
      }));
    })();
  }, [setTuning]);

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

  const speakFromPath = useCallback(
    async (pathJa: string, pathEn: string) => {
      if (!isLoadableRef.current) {
        return;
      }

      const playJapanese = shouldSpeakJapanese && Boolean(pathJa);
      const playEnglish = shouldSpeakEnglish && Boolean(pathEn);
      if (!playJapanese && !playEnglish) {
        finishPlaying();
        return;
      }

      if (firstSpeechRef.current) {
        firstSpeechRef.current = false;
        suppressPostFirstSpeechRef.current = true;
      }

      cleanupAllPlayers();

      if (playingTimeoutRef.current) {
        clearTimeout(playingTimeoutRef.current);
      }

      playingRef.current = true;

      playingTimeoutRef.current = setTimeout(() => {
        if (!playingRef.current) {
          return;
        }
        console.warn(
          '[useTTS] Playback safety timeout reached, force resetting'
        );
        cleanupAllPlayers();
        finishPlaying();
      }, PLAYBACK_TIMEOUT_MS);

      if (!playJapanese && playEnglish) {
        const enCleanup = () => {
          safeRemovePlayer(enHandleRef.current?.player ?? null);
          enHandleRef.current = null;
          finishPlaying();
        };

        enHandleRef.current = playAudio({
          uri: pathEn,
          onFinish: enCleanup,
          onError: () => enCleanup(),
        });
        return;
      }

      // JA（+ 任意で EN）再生
      const removeSoundJa = () => {
        const handle = jaHandleRef.current;
        if (handle) {
          safeRemovePlayer(handle.player);
          jaHandleRef.current = null;
        }
      };

      jaHandleRef.current = playAudio({
        uri: pathJa,
        onFinish: () => {
          // 日本語プレイヤーはまだremoveしない
          // コールバック内でremoveするとオーディオセッションが不安定になり
          // 直後に生成する英語プレイヤーの再生が開始されないことがある
          if (isLoadableRef.current && playEnglish) {
            // 音声セッションが安定するまで短いディレイを入れてから英語を再生
            setTimeout(() => {
              if (!isLoadableRef.current) {
                removeSoundJa();
                finishPlaying();
                return;
              }

              const enCleanup = () => {
                safeRemovePlayer(enHandleRef.current?.player ?? null);
                enHandleRef.current = null;
                removeSoundJa();
                finishPlaying();
              };

              enHandleRef.current = playAudio({
                uri: pathEn,
                onFinish: enCleanup,
                onError: () => enCleanup(),
              });
            }, EN_PLAYBACK_DELAY_MS);
          } else {
            removeSoundJa();
            finishPlaying();
          }
        },
        onError: () => {
          removeSoundJa();
          finishPlaying();
        },
      });
    },
    [cleanupAllPlayers, finishPlaying, shouldSpeakEnglish, shouldSpeakJapanese]
  );

  const ttsApiUrl = useMemo(() => {
    return isDevApp ? DEV_TTS_API_URL : PRODUCTION_TTS_API_URL;
  }, []);

  const speechWithText = useCallback(
    async (ja: string, en: string) => {
      if (!ja.length || !en.length || !isLoadableRef.current) {
        return;
      }

      playingRef.current = true;
      try {
        const idToken = user && (await getIdToken(user));
        if (!idToken) {
          console.warn('[useTTS] idToken is missing, skipping fetch');
          finishPlaying();
          return;
        }

        const fetched = await fetchSpeechAudio({
          textJa: ja,
          textEn: en,
          apiUrl: ttsApiUrl,
          idToken,
          jaVoiceName: ttsJaVoiceName || undefined,
          enVoiceName: ttsEnVoiceName || undefined,
        });

        if (!fetched) {
          console.warn('[useTTS] Failed to fetch speech audio');
          finishPlaying();
          return;
        }

        await speakFromPath(fetched.pathJa, fetched.pathEn);
      } catch (error) {
        console.error('[useTTS] speech error:', error);
        finishPlaying();
      }
    },
    [
      finishPlaying,
      speakFromPath,
      ttsApiUrl,
      ttsEnVoiceName,
      ttsJaVoiceName,
      user,
    ]
  );

  speechWithTextRef.current = speechWithText;

  // 停車中に次の NEXT アナウンス音声を先読みフェッチする
  const prefetchingRef = useRef(false);
  useEffect(() => {
    if (!enabled || !prefetchJa || !prefetchEn || prefetchingRef.current) {
      return;
    }
    // 現在のテキストと同じなら既にフェッチ済み or これからフェッチされるので不要
    if (prefetchJa === textJa && prefetchEn === textEn) {
      return;
    }
    prefetchingRef.current = true;
    (async () => {
      try {
        const idToken = user && (await getIdToken(user));
        if (!idToken) return;
        await fetchSpeechAudio({
          textJa: prefetchJa,
          textEn: prefetchEn,
          apiUrl: ttsApiUrl,
          idToken,
          jaVoiceName: ttsJaVoiceName || undefined,
          enVoiceName: ttsEnVoiceName || undefined,
        });
      } catch (e) {
        console.warn('[useTTS] Prefetch failed:', e);
      } finally {
        prefetchingRef.current = false;
      }
    })();
  }, [
    enabled,
    prefetchJa,
    prefetchEn,
    textJa,
    textEn,
    ttsApiUrl,
    ttsEnVoiceName,
    ttsJaVoiceName,
    user,
  ]);

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
    if (!enabled) {
      return;
    }

    if (!textJa || !textEn) {
      pendingRef.current = null;
      return;
    }

    const textChanged =
      !lastTriggeredTextRef.current ||
      lastTriggeredTextRef.current[0] !== textJa ||
      lastTriggeredTextRef.current[1] !== textEn;
    const stoppingStateChanged = stoppingState !== prevStoppingState;

    // テキストもstoppingStateも変化していなければスキップ
    if (!textChanged && !stoppingStateChanged) {
      return;
    }

    if (
      computeSuppressionDecision({
        suppressPostFirstSpeechRef,
        firstSpeechRef,
        suppressFirstSpeechUntilDepartureRef,
        arrived,
        stoppingStateChanged,
      })
    ) {
      return;
    }

    lastTriggeredTextRef.current = [textJa, textEn];

    // 再生中なら最新のテキストをpendingに記録して完了時にトリガー
    if (playingRef.current) {
      console.warn('[useTTS] Already playing, queuing text as pending');
      pendingRef.current = { textJa, textEn };
      return;
    }

    pendingRef.current = null;

    (async () => {
      try {
        await speechWithTextRef.current?.(textJa, textEn);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [arrived, enabled, prevStoppingState, stoppingState, textEn, textJa]);

  useEffect(() => {
    return () => {
      isLoadableRef.current = false;
      pendingRef.current = null;
      if (playingTimeoutRef.current) {
        clearTimeout(playingTimeoutRef.current);
        playingTimeoutRef.current = null;
      }
      cleanupAllPlayers();
      playingRef.current = false;
    };
  }, [cleanupAllPlayers]);
};
