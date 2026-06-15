import { getIdToken } from '@react-native-firebase/auth';
import { type AudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { DEV_TTS_API_URL, PRODUCTION_TTS_API_URL } from 'react-native-dotenv';
import { TransportType } from '~/@types/graphql';
import { STORAGE_KEYS } from '../constants';
import { storage } from '../lib/storage';
import speechState, { resetFirstSpeechAtom } from '../store/atoms/speech';
import { arrivedAtom, selectedBoundAtom } from '../store/atoms/station';
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
import { useCachedInitAnonymousUser } from './useCachedAnonymousUser';
import { useCurrentLine } from './useCurrentLine';
import { usePrevious } from './usePrevious';
import { useStoppingState } from './useStoppingState';
import { useTTSText } from './useTTSText';

// 再生が完了しない場合の最終フォールバックタイムアウト（ミリ秒）
// 通常のストール（Androidでのネイティブエラーや音声フォーカス喪失など）は
// ttsAudioPlayerのストール検知ウォッチドッグが先に打ち切って復帰させるため、
// これはウォッチドッグでも捕捉できない異常系に対する最後の砦
const PLAYBACK_TIMEOUT_MS = 300_000;

export const useTTS = (): void => {
  const { enabled, backgroundEnabled, ttsEnabledLanguages } =
    useAtomValue(speechState);
  const arrived = useAtomValue(arrivedAtom);
  const selectedBound = useAtomValue(selectedBoundAtom);
  const { ttsJaVoiceName, ttsEnVoiceName } = useAtomValue(tuningState);
  const setTuning = useSetAtom(tuningState);
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
  const isLoadableRef = useRef(true);
  const pendingRef = useRef<{ textJa: string; textEn: string } | null>(null);
  const speechWithTextRef = useRef<
    ((ja: string, en: string) => Promise<void>) | null
  >(null);
  const isBus = currentLine?.transportType === TransportType.Bus;
  const ttsResult = useTTSText(firstSpeechRef.current, enabled, isBus);
  const ttsText = ttsResult.text;
  const prefetchText = ttsResult.nextText;
  const [prevTextJa, prevTextEn] = usePrevious(ttsText);
  const [textJa, textEn] = ttsText;
  const [prefetchJa, prefetchEn] = prefetchText.length
    ? prefetchText
    : [undefined, undefined];
  const shouldSpeakJapanese = ttsEnabledLanguages.includes('JA');
  const shouldSpeakEnglish = ttsEnabledLanguages.includes('EN');

  const user = useCachedInitAnonymousUser();

  const jaHandleRef = useRef<PlayAudioHandle | null>(null);
  const enHandleRef = useRef<PlayAudioHandle | null>(null);
  // プレイヤーは使い回す。createAudioPlayerを発話のたびに呼ぶとAndroidの
  // AudioTrackが枯渇してTTSが停止するため、永続インスタンスをreplace()で再利用する
  const jaPlayerRef = useRef<AudioPlayer | null>(null);
  const enPlayerRef = useRef<AudioPlayer | null>(null);
  const playingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 現在の再生を止める（リスナー/ウォッチドッグを解放し一時停止）が、
  // 永続プレイヤー自体は破棄せず次の発話で再利用する
  const cleanupAllPlayers = useCallback(() => {
    safeRemoveListener(jaHandleRef.current?.listener ?? null);
    safeRemoveListener(enHandleRef.current?.listener ?? null);
    try {
      jaPlayerRef.current?.pause();
    } catch {}
    try {
      enPlayerRef.current?.pause();
    } catch {}
    jaHandleRef.current = null;
    enHandleRef.current = null;
  }, []);

  // アンマウント時のみ永続プレイヤーをネイティブごと解放する
  const releaseAllPlayers = useCallback(() => {
    safeRemoveListener(jaHandleRef.current?.listener ?? null);
    safeRemoveListener(enHandleRef.current?.listener ?? null);
    safeRemovePlayer(jaPlayerRef.current);
    safeRemovePlayer(enPlayerRef.current);
    jaHandleRef.current = null;
    enHandleRef.current = null;
    jaPlayerRef.current = null;
    enPlayerRef.current = null;
  }, []);

  useEffect(() => {
    const jaVoice = storage.getString(STORAGE_KEYS.TTS_JA_VOICE_NAME);
    const enVoice = storage.getString(STORAGE_KEYS.TTS_EN_VOICE_NAME);
    setTuning((prev) => ({
      ...prev,
      ttsJaVoiceName: jaVoice || prev.ttsJaVoiceName,
      ttsEnVoiceName: enVoice || prev.ttsEnVoiceName,
    }));
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

  // playingRefがtrueになった時点で必ず安全タイムアウトを張る。
  // フェッチやトークン取得がハングしてもplayingRefが解放されずTTS全体が
  // 停止するのを防ぐため、再生開始前のフェッチ段階も含めて監視する。
  const armPlaybackWatchdog = useCallback(() => {
    if (playingTimeoutRef.current) {
      clearTimeout(playingTimeoutRef.current);
    }
    playingTimeoutRef.current = setTimeout(() => {
      if (!playingRef.current) {
        return;
      }
      console.warn('[useTTS] Playback safety timeout reached, force resetting');
      cleanupAllPlayers();
      finishPlaying();
    }, PLAYBACK_TIMEOUT_MS);
  }, [cleanupAllPlayers, finishPlaying]);

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

      playingRef.current = true;
      armPlaybackWatchdog();

      // 再生終了/失敗時は永続プレイヤーを破棄せず、リスナーだけ解放して一時停止する
      const stopEn = () => {
        safeRemoveListener(enHandleRef.current?.listener ?? null);
        try {
          enPlayerRef.current?.pause();
        } catch {}
        enHandleRef.current = null;
      };
      const stopJa = () => {
        safeRemoveListener(jaHandleRef.current?.listener ?? null);
        try {
          jaPlayerRef.current?.pause();
        } catch {}
        jaHandleRef.current = null;
      };

      if (!playJapanese && playEnglish) {
        const enCleanup = () => {
          stopEn();
          finishPlaying();
        };

        enHandleRef.current = playAudio({
          uri: pathEn,
          player: enPlayerRef.current,
          onFinish: enCleanup,
          onError: () => enCleanup(),
        });
        enPlayerRef.current = enHandleRef.current.player;
        return;
      }

      // JA（+ 任意で EN）再生
      jaHandleRef.current = playAudio({
        uri: pathJa,
        player: jaPlayerRef.current,
        onFinish: () => {
          if (!isLoadableRef.current || !playEnglish) {
            stopJa();
            finishPlaying();
            return;
          }

          // プレイヤーを使い回すため、JA完了後すぐに英語へ差し替えて再生する
          const enCleanup = () => {
            stopEn();
            stopJa();
            finishPlaying();
          };

          // playAudioが生成・再生開始に失敗してもfinishPlayingへ確実に到達させる
          try {
            enHandleRef.current = playAudio({
              uri: pathEn,
              player: enPlayerRef.current,
              onFinish: enCleanup,
              onError: () => enCleanup(),
            });
            enPlayerRef.current = enHandleRef.current.player;
          } catch (e) {
            console.warn('[useTTS] EN playback failed to start:', e);
            enCleanup();
          }
        },
        onError: () => {
          stopJa();
          finishPlaying();
        },
      });
      jaPlayerRef.current = jaHandleRef.current.player;
    },
    [
      armPlaybackWatchdog,
      cleanupAllPlayers,
      finishPlaying,
      shouldSpeakEnglish,
      shouldSpeakJapanese,
    ]
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
      // フェッチやトークン取得がハングした場合でもplayingRefが確実に解放される
      // よう、再生開始前のこの時点から安全タイムアウトを張る
      armPlaybackWatchdog();
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
          jaVoiceName: ttsJaVoiceName,
          enVoiceName: ttsEnVoiceName,
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
      armPlaybackWatchdog,
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
          jaVoiceName: ttsJaVoiceName,
          enVoiceName: ttsEnVoiceName,
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

    (async () => {
      try {
        await speechWithTextRef.current?.(textJa, textEn);
      } catch (err) {
        console.error(err);
      }
    })();
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
    return () => {
      isLoadableRef.current = false;
      pendingRef.current = null;
      if (playingTimeoutRef.current) {
        clearTimeout(playingTimeoutRef.current);
        playingTimeoutRef.current = null;
      }
      releaseAllPlayers();
      playingRef.current = false;
    };
  }, [releaseAllPlayers]);
};
