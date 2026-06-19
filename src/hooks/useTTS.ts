import { type AudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Platform } from 'react-native';
import { TransportType } from '~/@types/graphql';
import { STORAGE_KEYS } from '../constants';
import { getSessionToken } from '../lib/session';
import { storage } from '../lib/storage';
import { workerUrl } from '../lib/workerApi';
import speechState, { resetFirstSpeechAtom } from '../store/atoms/speech';
import { arrivedAtom, selectedBoundAtom } from '../store/atoms/station';
import tuningState from '../store/atoms/tuning';
import { computeSuppressionDecision } from '../utils/computeSuppressionDecision';
import {
  type PlayAudioHandle,
  playAudio,
  safeRemoveListener,
  safeRemovePlayer,
} from '../utils/ttsAudioPlayer';
import { fetchSpeechAudio } from '../utils/ttsSpeechFetcher';
import { useCurrentLine } from './useCurrentLine';
import { usePrevious } from './usePrevious';
import { useStoppingState } from './useStoppingState';
import { useTTSText } from './useTTSText';

// 再生開始前（フェッチ・トークン取得など）のハングに対する安全タイムアウト（ミリ秒）
// プレイヤー未生成の準備段階はttsAudioPlayerのストール検知ウォッチドッグが効かないため、
// この区間がハングしてもplayingRefを確実に解放してTTS全体の停止を防ぐ。
// 実際の音声再生が始まった時点でこのタイムアウトは解除し（armPlaybackWatchdogを参照）、
// 以降の再生中の進行停止検知はttsAudioPlayerのストール監視に委ねる。
// これにより健全な長尺再生が一定時間で打ち切られることはなくなる。
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
  // 発話ごとに採番する世代ID。タイムアウト・新規発話で古いfetch継続を破棄し、
  // 解決の遅れた古い音声が後から割り込んで再生されるのを防ぐ
  const speechRunIdRef = useRef(0);
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

  const jaHandleRef = useRef<PlayAudioHandle | null>(null);
  const enHandleRef = useRef<PlayAudioHandle | null>(null);
  // Androidでは createAudioPlayer を発話のたびに呼ぶと AudioTrack が枯渇して
  // TTS が停止するため、永続インスタンスを replace() で再利用する。
  // 一方 iOS では replace() による再利用がバックグラウンド再生を壊す。
  // ネイティブ(expo-audio AudioPlayer.swift)の replace は「差し替え時点で再生中
  // だった場合のみ」ロード完了後に再生を再開する実装で、JS から replace 直前に
  // pause() するため wasPlaying=false となり自動再開されない。直後の play() は
  // まだ readyToPlay でない差し替え後アイテムに対する呼び出しとなり、
  // フォアグラウンドでは間に合うがバックグラウンドでは再生が始まらない。
  // AudioTrack 枯渇は Android 固有の問題のため、再利用は Android に限定し、
  // iOS は従来どおり発話ごとに生成・破棄して背景再生を維持する。
  const reusePlayers = Platform.OS === 'android';
  const jaPlayerRef = useRef<AudioPlayer | null>(null);
  const enPlayerRef = useRef<AudioPlayer | null>(null);
  const playingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 現在の再生を止める（リスナー/ウォッチドッグを解放）。
  // Android は永続プレイヤーを破棄せず一時停止して次の発話で再利用し、
  // iOS は今回再生したプレイヤーをネイティブごと解放する。
  const cleanupAllPlayers = useCallback(() => {
    safeRemoveListener(jaHandleRef.current?.listener ?? null);
    safeRemoveListener(enHandleRef.current?.listener ?? null);
    if (reusePlayers) {
      try {
        jaPlayerRef.current?.pause();
      } catch {}
      try {
        enPlayerRef.current?.pause();
      } catch {}
    } else {
      safeRemovePlayer(jaHandleRef.current?.player ?? null);
      safeRemovePlayer(enHandleRef.current?.player ?? null);
      jaPlayerRef.current = null;
      enPlayerRef.current = null;
    }
    jaHandleRef.current = null;
    enHandleRef.current = null;
  }, [reusePlayers]);

  // アンマウント時に全プレイヤーをネイティブごと解放する。
  // 再利用中の永続プレイヤーと再生中ハンドルのプレイヤー双方を確実に解放する。
  const releaseAllPlayers = useCallback(() => {
    safeRemoveListener(jaHandleRef.current?.listener ?? null);
    safeRemoveListener(enHandleRef.current?.listener ?? null);
    safeRemovePlayer(jaPlayerRef.current);
    safeRemovePlayer(enPlayerRef.current);
    safeRemovePlayer(jaHandleRef.current?.player ?? null);
    safeRemovePlayer(enHandleRef.current?.player ?? null);
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

  // playingRefがtrueになった時点で安全タイムアウトを張る。
  // フェッチやトークン取得がハングしてもplayingRefが解放されずTTS全体が
  // 停止するのを防ぐための、再生開始前の準備段階専用の監視。
  // 実際の再生が始まったらclearPlaybackWatchdogで解除し、以降は再生時間に
  // よらず打ち切らない（進行停止はttsAudioPlayerのストール監視が担う）。
  const armPlaybackWatchdog = useCallback(
    (runId: number = speechRunIdRef.current) => {
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
        // 世代を進めて、強制リセット後に古いfetch継続が再生へ進むのを無効化する
        speechRunIdRef.current += 1;
        cleanupAllPlayers();
        finishPlaying();
      }, PLAYBACK_TIMEOUT_MS);
    },
    [cleanupAllPlayers, finishPlaying]
  );

  // 実際の音声再生が始まったら準備段階の安全タイムアウトを解除する。
  // これ以降は再生が何分続いても打ち切らず、進行停止の検知は
  // ttsAudioPlayerのストール監視（STALL_TIMEOUT_MS）に委ねる。
  const clearPlaybackWatchdog = useCallback(() => {
    if (playingTimeoutRef.current) {
      clearTimeout(playingTimeoutRef.current);
      playingTimeoutRef.current = null;
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

      playingRef.current = true;

      // 再生終了/失敗時の停止処理。Android はリスナーだけ解放してプレイヤーを
      // 一時停止し再利用、iOS はプレイヤーをネイティブごと破棄する。
      const stopEn = () => {
        safeRemoveListener(enHandleRef.current?.listener ?? null);
        if (reusePlayers) {
          try {
            enPlayerRef.current?.pause();
          } catch {}
        } else {
          safeRemovePlayer(enHandleRef.current?.player ?? null);
          enPlayerRef.current = null;
        }
        enHandleRef.current = null;
      };
      const stopJa = () => {
        safeRemoveListener(jaHandleRef.current?.listener ?? null);
        if (reusePlayers) {
          try {
            jaPlayerRef.current?.pause();
          } catch {}
        } else {
          safeRemovePlayer(jaHandleRef.current?.player ?? null);
          jaPlayerRef.current = null;
        }
        jaHandleRef.current = null;
      };

      if (!playJapanese && playEnglish) {
        const enCleanup = () => {
          stopEn();
          finishPlaying();
        };

        enHandleRef.current = playAudio({
          uri: pathEn,
          player: reusePlayers ? enPlayerRef.current : null,
          onFinish: enCleanup,
          onError: () => enCleanup(),
        });
        enPlayerRef.current = reusePlayers ? enHandleRef.current.player : null;
        // 再生が始まったので準備段階の安全タイムアウトを解除する
        clearPlaybackWatchdog();
        return;
      }

      // JA（+ 任意で EN）再生
      jaHandleRef.current = playAudio({
        uri: pathJa,
        player: reusePlayers ? jaPlayerRef.current : null,
        onFinish: () => {
          if (!isLoadableRef.current || !playEnglish) {
            stopJa();
            finishPlaying();
            return;
          }

          // JA完了後すぐに英語を再生する（Androidは同一プレイヤーをreplace、
          // iOSは英語用プレイヤーを新規生成する）
          const enCleanup = () => {
            stopEn();
            stopJa();
            finishPlaying();
          };

          // playAudioが生成・再生開始に失敗してもfinishPlayingへ確実に到達させる
          try {
            enHandleRef.current = playAudio({
              uri: pathEn,
              player: reusePlayers ? enPlayerRef.current : null,
              onFinish: enCleanup,
              onError: () => enCleanup(),
            });
            enPlayerRef.current = reusePlayers
              ? enHandleRef.current.player
              : null;
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
      jaPlayerRef.current = reusePlayers ? jaHandleRef.current.player : null;
      // 再生が始まったので準備段階の安全タイムアウトを解除する
      clearPlaybackWatchdog();
    },
    [
      cleanupAllPlayers,
      clearPlaybackWatchdog,
      finishPlaying,
      reusePlayers,
      shouldSpeakEnglish,
      shouldSpeakJapanese,
    ]
  );

  const ttsApiUrl = useMemo(() => workerUrl('/tts'), []);

  const speechWithText = useCallback(
    async (ja: string, en: string) => {
      if (!ja.length || !en.length || !isLoadableRef.current) {
        return;
      }

      // この発話の世代IDを採番。await の合間にタイムアウトや新規発話で世代が
      // 進んでいたら、古い継続は再生へ進めず破棄する
      const runId = speechRunIdRef.current + 1;
      speechRunIdRef.current = runId;
      playingRef.current = true;
      // フェッチやトークン取得がハングした場合でもplayingRefが確実に解放される
      // よう、再生開始前のこの時点から安全タイムアウトを張る
      armPlaybackWatchdog(runId);
      // 世代が進んでいる（=この継続はもう無効）場合は何もしない。
      // playingRefは新しい発話が所有しているため、ここでリセットしてはならない
      const isStaleRun = () =>
        speechRunIdRef.current !== runId ||
        !playingRef.current ||
        !isLoadableRef.current;
      try {
        const idToken = await getSessionToken();
        if (isStaleRun()) {
          return;
        }
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

        if (isStaleRun()) {
          return;
        }
        if (!fetched) {
          console.warn('[useTTS] Failed to fetch speech audio');
          finishPlaying();
          return;
        }

        await speakFromPath(fetched.pathJa, fetched.pathEn);
      } catch (error) {
        if (isStaleRun()) {
          return;
        }
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
        const idToken = await getSessionToken();
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
