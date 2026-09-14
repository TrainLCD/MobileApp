import { File, Paths } from 'expo-file-system';
import { useAtomValue } from 'jotai';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { VITS_CPU_NUM_THREADS, VITS_SPEED_RATES } from '~/constants/vits';
import { isVitsTTSEnabled, subscribeRemoteConfig } from '~/lib/remoteConfig';
import {
  ensureVitsAssets,
  fileUriToPath,
  getInstalledVitsAssets,
  type VitsInstalledAssets,
} from '~/lib/vits/assets';
import { ttsSpeedPreferenceAtom } from '~/store/atoms/speech';
import { getVitsTtsModule } from '~/utils/native/ios/vitsTtsModule';
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

/**
 * 端末内合成で英語を読めるかを呼び出し側から同期的に問い合わせられる SpeechEngine。
 * useTTS はこれを見て、英語を端末内蔵 TTS へまとめて渡すか、日本語と分けて
 * こちらへ回すかを決める (分けると発話間に合成待ちのラグが入るため、使えない
 * ときは従来どおり日英をまとめて端末内蔵 TTS のキューへ積む)。
 */
export interface EnglishSpeechEngine extends SpeechEngine {
  isAvailable: () => boolean;
}

/**
 * iOS でリモート TTS が使えない回に、英語だけを VITS (端末内合成) で読み上げる
 * エンジン。日本語は VITS の英語モデルが話せないため、呼び出し側が
 * `speakJa: false` にして渡す契約になっている。
 *
 * 使える条件が 1 つでも欠けると、その回の英語は引数で受け取った
 * エンジン (端末内蔵 TTS) が読む。onUnavailable は呼ばない。
 * - ネイティブモジュールがある (本体アプリの iOS のみ。App Clip / Android は無い)
 * - Remote Config (vits_tts_enabled_ios) で有効化されている
 * - 音声モデルと発音辞書の取得・検証が完了している
 *
 * 合成器の初期化 (ONNX セッションの構築) は初回の発話まで遅らせる。常駐メモリを
 * 増やしたくないためで、リモート TTS が使える通常時は VITS を一切メモリへ載せない。
 */
export const useVitsSpeechEngine = (
  fallbackEngine: SpeechEngine
): EnglishSpeechEngine => {
  // 発話ごとに採番する世代 ID。停止や新規発話で古い合成の継続を破棄する
  const runIdRef = useRef(0);
  const handleRef = useRef<PlayAudioHandle | null>(null);
  const fileRef = useRef<File | null>(null);
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
      if (getVitsTtsModule() && isVitsTTSEnabled()) {
        void ensureVitsAssets();
      }
    };
    kick();
    return subscribeRemoteConfig(kick);
  }, []);

  const releasePlayer = useCallback(() => {
    safeRemoveListener(handleRef.current?.listener ?? null);
    safeRemovePlayer(handleRef.current?.player ?? null);
    handleRef.current = null;
    const file = fileRef.current;
    fileRef.current = null;
    if (file) {
      try {
        file.delete();
      } catch {}
    }
  }, []);

  const stop = useCallback(() => {
    runIdRef.current += 1;
    releasePlayer();
    fallbackEngine.stop();
  }, [fallbackEngine, releasePlayer]);

  const isAvailable = useCallback(
    (): boolean =>
      getVitsTtsModule() !== null &&
      isVitsTTSEnabled() &&
      getInstalledVitsAssets() !== null,
    []
  );

  const ensureSetup = useCallback(
    (assets: VitsInstalledAssets): Promise<void> => {
      const current = setupRef.current;
      if (current && current.version === assets.version) {
        return current.promise;
      }
      const module = getVitsTtsModule();
      if (!module) {
        return Promise.reject(new Error('VITS native module is unavailable'));
      }
      const promise = module
        .setup({
          modelPath: assets.modelPath,
          tokensPath: assets.tokensPath,
          lexiconPath: assets.lexiconPath,
          cpuNumThreads: VITS_CPU_NUM_THREADS,
        })
        .then(() => undefined)
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

      // このエンジンは英語だけを読む契約。日本語が残っている回は、読み落としを
      // 防ぐため端末内蔵 TTS へ丸ごと委譲する (呼び出し側が speakJa: false にして
      // 渡すため、通常ここは通らない)
      if (request.speakJa) {
        fallbackEngine.speak(request, callbacks);
        return;
      }
      // 英語を読まない回は VITS の出番が無い
      if (!request.speakEn) {
        callbacks.onSettled();
        return;
      }

      // 端末内合成が使えない回は、その回の英語を端末内蔵 TTS が読む。
      // ここで onUnavailable を返すと呼び出し側 (VOICEVOX エンジン) が
      // 日本語から読み直しかねないため、この層で吸収する。
      const fallback = () => {
        fallbackEngine.speak(request, callbacks);
      };

      const module = getVitsTtsModule();
      if (!module || !isVitsTTSEnabled()) {
        fallback();
        return;
      }
      const assets = getInstalledVitsAssets();
      if (!assets) {
        // 未取得なら取得を促しつつ、この回は諦める
        void ensureVitsAssets();
        fallback();
        return;
      }

      const text = toSpeakableText(request.ssmlEn, 'EN', 'native');
      if (!text) {
        callbacks.onSettled();
        return;
      }

      void (async () => {
        let file: File | null = null;
        try {
          await ensureSetup(assets);
          if (isStaleRun()) {
            return;
          }
          file = new File(Paths.cache, `vits_${Date.now()}_${runId}.wav`);
          await module.synthesize({
            text,
            speed: VITS_SPEED_RATES[speedRef.current],
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
          console.warn('[useVitsSpeechEngine] synthesis failed:', e);
          fallback();
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
          releasePlayer();
          if (isStaleRun()) {
            return;
          }
          callbacks.onSettled();
        };

        fileRef.current = file;
        try {
          handleRef.current = playAudio({
            uri: file.uri,
            onFinish: settle,
            onError: settle,
          });
        } catch (e) {
          console.warn('[useVitsSpeechEngine] playback failed to start:', e);
          settle();
        }
      })();
    },
    [ensureSetup, fallbackEngine, releasePlayer]
  );

  useEffect(() => stop, [stop]);

  return useMemo(
    () => ({ speak, stop, isAvailable }),
    [speak, stop, isAvailable]
  );
};
