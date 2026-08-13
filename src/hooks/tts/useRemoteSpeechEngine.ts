import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  REMOTE_TTS_INSTRUCTIONS_EN,
  REMOTE_TTS_INSTRUCTIONS_JA,
  REMOTE_TTS_MAX_INPUT_BYTES,
  REMOTE_TTS_MODEL,
  REMOTE_TTS_VOICE,
} from '../../constants';
import { getSessionToken } from '../../lib/session';
import { workerUrl } from '../../lib/workerApi';
import {
  toSpeakableText,
  truncateToByteLimit,
} from '../../utils/speakableText';
import {
  type PlayAudioHandle,
  playAudio,
  safeRemoveListener,
  safeRemovePlayer,
} from '../../utils/ttsAudioPlayer';
import { fetchSpeechAudio } from '../../utils/ttsSpeechFetcher';
import type {
  SpeechEngine,
  SpeechEngineCallbacks,
  SpeechEngineRequest,
} from './speechEngine';

/**
 * Worker の /tts 経由で gpt-4o-mini-tts に合成させ、expo-audio で再生するエンジン。
 * 使用するかどうかは Remote Config (remote_tts_enabled_ios /
 * remote_tts_enabled_android) が決める。合成に失敗した場合は onUnavailable を呼び、
 * 呼び出し側 (useTTS) がその回だけ端末内蔵 TTS へフォールバックする。
 */
export const useRemoteSpeechEngine = (): SpeechEngine => {
  // 発話ごとに採番する世代 ID。停止や新規発話で古い fetch 継続を破棄し、
  // 解決の遅れた音声が後から割り込んで再生されるのを防ぐ。
  const runIdRef = useRef(0);
  const jaHandleRef = useRef<PlayAudioHandle | null>(null);
  const enHandleRef = useRef<PlayAudioHandle | null>(null);

  // iOS は replace() によるプレイヤー再利用がバックグラウンド再生を壊すため、
  // 発話ごとに生成し、終了時にネイティブごと解放する。
  const releaseJaPlayer = useCallback(() => {
    safeRemoveListener(jaHandleRef.current?.listener ?? null);
    safeRemovePlayer(jaHandleRef.current?.player ?? null);
    jaHandleRef.current = null;
  }, []);

  const releaseEnPlayer = useCallback(() => {
    safeRemoveListener(enHandleRef.current?.listener ?? null);
    safeRemovePlayer(enHandleRef.current?.player ?? null);
    enHandleRef.current = null;
  }, []);

  const stop = useCallback(() => {
    runIdRef.current += 1;
    releaseJaPlayer();
    releaseEnPlayer();
  }, [releaseJaPlayer, releaseEnPlayer]);

  // 取得済みの音声を JA → EN の順に再生する。どの経路を通っても
  // onSettled がちょうど 1 回だけ呼ばれるようにする。
  const playFetched = useCallback(
    (
      pathJa: string | null,
      pathEn: string | null,
      callbacks: SpeechEngineCallbacks,
      isStaleRun: () => boolean
    ) => {
      callbacks.onSpeechStarted?.();

      const settle = () => {
        if (isStaleRun()) {
          return;
        }
        callbacks.onSettled();
      };

      const playEnglish = () => {
        if (!pathEn) {
          settle();
          return;
        }
        const finish = () => {
          releaseEnPlayer();
          settle();
        };
        // playAudio が生成・再生開始に失敗しても必ず完了へ到達させる
        try {
          enHandleRef.current = playAudio({
            uri: pathEn,
            onFinish: finish,
            onError: finish,
          });
        } catch (e) {
          console.warn(
            '[useRemoteSpeechEngine] EN playback failed to start:',
            e
          );
          finish();
        }
      };

      if (!pathJa) {
        playEnglish();
        return;
      }

      const finishJa = () => {
        releaseJaPlayer();
        if (isStaleRun()) {
          return;
        }
        playEnglish();
      };

      try {
        jaHandleRef.current = playAudio({
          uri: pathJa,
          onFinish: finishJa,
          onError: finishJa,
        });
      } catch (e) {
        console.warn('[useRemoteSpeechEngine] JA playback failed to start:', e);
        finishJa();
      }
    },
    [releaseJaPlayer, releaseEnPlayer]
  );

  const speak = useCallback(
    (request: SpeechEngineRequest, callbacks: SpeechEngineCallbacks) => {
      const runId = runIdRef.current + 1;
      runIdRef.current = runId;
      const isStaleRun = () => runIdRef.current !== runId;
      // 合成できなかったときの通知。onUnavailable 未指定なら通常の完了として扱う。
      const reportUnavailable = () => {
        if (callbacks.onUnavailable) {
          callbacks.onUnavailable();
          return;
        }
        callbacks.onSettled();
      };

      void (async () => {
        if (!request.speakJa && !request.speakEn) {
          callbacks.onSettled();
          return;
        }

        try {
          const idToken = await getSessionToken();
          if (isStaleRun()) {
            return;
          }
          if (!idToken) {
            console.warn(
              '[useRemoteSpeechEngine] session token is missing, skipping fetch'
            );
            reportUnavailable();
            return;
          }

          // 合成は文字数課金のため、無効な言語のテキストは送らない
          const textJa = request.speakJa
            ? truncateToByteLimit(
                toSpeakableText(request.ssmlJa, 'JA'),
                REMOTE_TTS_MAX_INPUT_BYTES
              )
            : '';
          const textEn = request.speakEn
            ? truncateToByteLimit(
                toSpeakableText(request.ssmlEn, 'EN'),
                REMOTE_TTS_MAX_INPUT_BYTES
              )
            : '';

          const fetched = await fetchSpeechAudio({
            textJa,
            textEn,
            apiUrl: workerUrl('/tts'),
            idToken,
            model: REMOTE_TTS_MODEL,
            jaVoiceName: REMOTE_TTS_VOICE,
            enVoiceName: REMOTE_TTS_VOICE,
            instructionsJa: REMOTE_TTS_INSTRUCTIONS_JA,
            instructionsEn: REMOTE_TTS_INSTRUCTIONS_EN,
          });

          if (isStaleRun()) {
            return;
          }
          if (!fetched || (!fetched.pathJa && !fetched.pathEn)) {
            console.warn(
              '[useRemoteSpeechEngine] failed to fetch speech audio'
            );
            reportUnavailable();
            return;
          }

          playFetched(fetched.pathJa, fetched.pathEn, callbacks, isStaleRun);
        } catch (error) {
          if (isStaleRun()) {
            return;
          }
          console.error('[useRemoteSpeechEngine] speech error:', error);
          reportUnavailable();
        }
      })();
    },
    [playFetched]
  );

  useEffect(() => stop, [stop]);

  return useMemo(() => ({ speak, stop }), [speak, stop]);
};
