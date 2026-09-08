import { File, Paths } from 'expo-file-system';
import { useAtomValue } from 'jotai';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  VOICEVOX_CPU_NUM_THREADS,
  VOICEVOX_SPEED_SCALES,
} from '~/constants/voicevox';
import {
  getVoicevoxTTSStyleId,
  isVoicevoxTTSEnabled,
  subscribeRemoteConfig,
} from '~/lib/remoteConfig';
import {
  ensureVoicevoxAssets,
  fileUriToPath,
  getInstalledVoicevoxAssets,
  type VoicevoxInstalledAssets,
} from '~/lib/voicevox/assets';
import { ttsSpeedPreferenceAtom } from '~/store/atoms/speech';
import { getVoicevoxTtsModule } from '~/utils/native/ios/voicevoxTtsModule';
import { toSpeakableText } from '~/utils/speakableText';
import {
  type PlayAudioHandle,
  playAudio,
  safeRemoveListener,
  safeRemovePlayer,
} from '~/utils/ttsAudioPlayer';
import type {
  SpeechEngine,
  SpeechEngineCallbacks,
  SpeechEngineRequest,
} from './speechEngine';

// iOS でリモート TTS が使えない回に、日本語だけを VOICEVOX CORE (端末内合成) で
// 読み上げるエンジン。英語は VOICEVOX が話せないため、引数で受け取った
// エンジン (端末内蔵 TTS) へ委譲する。
//
// 使える条件が 1 つでも欠けると onUnavailable を返し、呼び出し側 (useTTS) が
// その回だけ端末内蔵 TTS で日英とも読み上げる。
//   - ネイティブモジュールがある (本体アプリの iOS のみ。App Clip / Android は無い)
//   - Remote Config (voicevox_tts_enabled_ios) で有効化されている
//   - 辞書と音声モデルの取得・検証が完了している
//
// 合成器の初期化 (VVM の展開) は初回の発話まで遅らせる。常駐メモリを増やしたく
// ないためで、リモート TTS が使える通常時は VOICEVOX を一切メモリへ載せない。
export const useVoicevoxSpeechEngine = (
  englishEngine: SpeechEngine
): SpeechEngine => {
  // 発話ごとに採番する世代 ID。停止や新規発話で古い合成の継続を破棄する
  const runIdRef = useRef(0);
  const jaHandleRef = useRef<PlayAudioHandle | null>(null);
  const jaFileRef = useRef<File | null>(null);
  // setup 済みの資産バージョン。バージョンが変わったら setup し直す
  const setupRef = useRef<{
    version: string;
    promise: Promise<void>;
  } | null>(null);

  const speedPreference = useAtomValue(ttsSpeedPreferenceAtom);
  const speedRef = useRef(speedPreference);
  useEffect(() => {
    speedRef.current = speedPreference;
  }, [speedPreference]);

  // 有効化されたら資産の取得を始めておく。発話時に取得を待つと放送に間に合わない
  // ため、TTS が有効な間 (このフックがマウントされている間) にバックグラウンドで
  // 揃えておき、発話時は取得済みかどうかだけを見る。
  useEffect(() => {
    const kick = () => {
      if (getVoicevoxTtsModule() && isVoicevoxTTSEnabled()) {
        void ensureVoicevoxAssets();
      }
    };
    kick();
    return subscribeRemoteConfig(kick);
  }, []);

  const releaseJaPlayer = useCallback(() => {
    safeRemoveListener(jaHandleRef.current?.listener ?? null);
    safeRemovePlayer(jaHandleRef.current?.player ?? null);
    jaHandleRef.current = null;
    const file = jaFileRef.current;
    jaFileRef.current = null;
    if (file) {
      try {
        file.delete();
      } catch {}
    }
  }, []);

  const stop = useCallback(() => {
    runIdRef.current += 1;
    releaseJaPlayer();
    englishEngine.stop();
  }, [englishEngine, releaseJaPlayer]);

  const ensureSetup = useCallback(
    (assets: VoicevoxInstalledAssets): Promise<void> => {
      const current = setupRef.current;
      if (current && current.version === assets.version) {
        return current.promise;
      }
      const module = getVoicevoxTtsModule();
      if (!module) {
        return Promise.reject(
          new Error('VOICEVOX native module is unavailable')
        );
      }
      const promise = module
        .setup({
          openJtalkDicDir: assets.openJtalkDicDir,
          voiceModelPaths: assets.voiceModelPaths,
          cpuNumThreads: VOICEVOX_CPU_NUM_THREADS,
        })
        .then((result) => {
          const styleId = getVoicevoxTTSStyleId();
          if (!result.styleIds.includes(styleId)) {
            throw new Error(
              `style ${styleId} is not in the loaded voice models (available: ${result.styleIds.join(',')})`
            );
          }
        })
        .catch((e) => {
          // 失敗した setup を覚えたままにすると以後ずっと不可になるため、次回やり直す
          if (setupRef.current?.promise === promise) {
            setupRef.current = null;
          }
          throw e;
        });
      setupRef.current = { version: assets.version, promise };
      return promise;
    },
    []
  );

  const speak = useCallback(
    (request: SpeechEngineRequest, callbacks: SpeechEngineCallbacks) => {
      const runId = runIdRef.current + 1;
      runIdRef.current = runId;
      const isStaleRun = () => runIdRef.current !== runId;
      const reportUnavailable = () => {
        if (callbacks.onUnavailable) {
          callbacks.onUnavailable();
          return;
        }
        callbacks.onSettled();
      };

      // 日本語を読まない回は VOICEVOX の出番が無い。英語エンジンへそのまま渡す
      if (!request.speakJa) {
        englishEngine.speak(request, callbacks);
        return;
      }

      const module = getVoicevoxTtsModule();
      if (!module || !isVoicevoxTTSEnabled()) {
        reportUnavailable();
        return;
      }
      const assets = getInstalledVoicevoxAssets();
      if (!assets) {
        // 未取得なら取得を促しつつ、この回は諦める
        void ensureVoicevoxAssets();
        reportUnavailable();
        return;
      }

      const text = toSpeakableText(request.ssmlJa, 'JA', 'native');
      if (!text) {
        reportUnavailable();
        return;
      }

      void (async () => {
        let file: File | null = null;
        try {
          await ensureSetup(assets);
          if (isStaleRun()) {
            return;
          }
          file = new File(Paths.cache, `voicevox_${Date.now()}_${runId}.wav`);
          await module.synthesize({
            text,
            styleId: getVoicevoxTTSStyleId(),
            speedScale: VOICEVOX_SPEED_SCALES[speedRef.current],
            outputPath: fileUriToPath(file.uri),
          });
        } catch (e) {
          if (file) {
            try {
              file.delete();
            } catch {}
          }
          if (isStaleRun()) {
            return;
          }
          console.warn('[useVoicevoxSpeechEngine] synthesis failed:', e);
          reportUnavailable();
          return;
        }
        if (isStaleRun()) {
          try {
            file.delete();
          } catch {}
          return;
        }

        callbacks.onSpeechStarted?.();

        const settle = () => {
          if (isStaleRun()) {
            return;
          }
          callbacks.onSettled();
        };

        // 日本語の再生が始まった後は、英語側の失敗も含めて onSettled で終える
        // (途中まで読んだ放送を頭から読み直さない)
        const speakEnglish = () => {
          if (!request.speakEn) {
            settle();
            return;
          }
          englishEngine.speak(
            { ...request, speakJa: false },
            { onSettled: settle, onUnavailable: settle }
          );
        };

        const finishJa = () => {
          releaseJaPlayer();
          if (isStaleRun()) {
            return;
          }
          speakEnglish();
        };

        jaFileRef.current = file;
        try {
          jaHandleRef.current = playAudio({
            uri: file.uri,
            onFinish: finishJa,
            onError: finishJa,
          });
        } catch (e) {
          console.warn(
            '[useVoicevoxSpeechEngine] JA playback failed to start:',
            e
          );
          finishJa();
        }
      })();
    },
    [englishEngine, ensureSetup, releaseJaPlayer]
  );

  useEffect(() => stop, [stop]);

  return useMemo(() => ({ speak, stop }), [speak, stop]);
};
