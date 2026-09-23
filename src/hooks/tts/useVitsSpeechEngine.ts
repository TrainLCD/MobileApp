import { File, Paths } from 'expo-file-system';
import { useAtomValue } from 'jotai';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { VITS_CPU_NUM_THREADS, VITS_SPEED_RATES } from '~/constants/vits';
import { isVitsTTSEnabled, subscribeRemoteConfig } from '~/lib/remoteConfig';
import {
  ensureVitsAssets,
  fileUriToPath,
  getInstalledVitsAssets,
  subscribeVitsAssets,
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
 * useTTS はこれを見て、日本語と分けてこちらへ回すかを決める。Android では
 * 分けると発話間に合成待ちのラグが入るため、使えないときは日英をまとめて
 * 端末内蔵 TTS のキューへ積む。
 */
export interface EnglishSpeechEngine extends SpeechEngine {
  isAvailable: () => boolean;
}

/**
 * iOS でリモート TTS が使えない回に、英語だけを VITS (端末内合成) で読み上げる
 * エンジン。日本語は VITS の英語モデルが話せないため、呼び出し側が
 * `speakJa: false` にして渡す契約になっている。
 *
 * 使える条件が 1 つでも欠けると、その回の英語は引数で受け取ったエンジンへ渡す。
 * onUnavailable は呼ばない。渡す先は useTTS が決めており、Android は端末内蔵 TTS、
 * iOS は「読み上げないエンジン」なので、iOS ではその回の英語が流れない
 * (端末内蔵 TTS のコンパクト音声を流さない方針。useTTS の SILENT_SPEECH_ENGINE 参照)。
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

  // 資産が削除されるとネイティブ側は release() で設定ごと破棄する。setup 済みの
  // 記録を残したままだと、同じ version を取り直したときに setup を省略してしまい、
  // 以後の合成が not_initialized で失敗し続ける。資産が無くなった時点で捨てる。
  useEffect(
    () =>
      subscribeVitsAssets(() => {
        if (!getInstalledVitsAssets()) {
          setupRef.current = null;
        }
      }),
    []
  );

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
      // 防ぐため委譲先へ丸ごと渡す (呼び出し側が speakJa: false にして渡すため、
      // 通常ここは通らない)
      if (request.speakJa) {
        fallbackEngine.speak(request, callbacks);
        return;
      }
      // 英語を読まない回は VITS の出番が無い
      if (!request.speakEn) {
        callbacks.onSettled();
        return;
      }

      // 端末内合成が使えない回は委譲先へ渡す。ここで onUnavailable を返すと
      // 呼び出し側 (VOICEVOX エンジン) が日本語から読み直しかねないため、
      // この層で吸収する。
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

        const settle = () => {
          releasePlayer();
          if (isStaleRun()) {
            return;
          }
          callbacks.onSettled();
        };

        // playAudio は最初の play() が同期的に失敗すると、戻り値を返す前に
        // onError を呼ぶ。その回は英語を一度も再生できていないので、初回放送
        // フラグを確定させず委譲先へ回す。プレイヤーの解放には playAudio の
        // 戻り値が要るため、同期的なエラーは受け取っておいて代入後に処理する。
        let playbackStarted = false;
        const startupError: { current: { error: unknown } | null } = {
          current: null,
        };
        const failToStart = (e: unknown) => {
          console.warn('[useVitsSpeechEngine] playback failed to start:', e);
          releasePlayer();
          if (isStaleRun()) {
            return;
          }
          fallback();
        };

        fileRef.current = file;
        try {
          handleRef.current = playAudio({
            uri: file.uri,
            onFinish: settle,
            onError: (e) => {
              if (!playbackStarted) {
                startupError.current = { error: e };
                return;
              }
              // 再生が始まった後の中断は、頭から読み直さずそのまま終える
              settle();
            },
          });
        } catch (e) {
          failToStart(e);
          return;
        }
        if (startupError.current) {
          failToStart(startupError.current.error);
          return;
        }
        playbackStarted = true;
        callbacks.onSpeechStarted?.();
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
