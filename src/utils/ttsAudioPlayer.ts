import type { AudioPlayer } from 'expo-audio';
import { createAudioPlayer } from 'expo-audio';

// 再生位置が進まない状態がこの時間続いたらストールとみなして打ち切る
// Android(ExoPlayer)は再生エラーや音声フォーカス喪失で停止しても
// JSへerrorイベントもdidJustFinishも届かないため、ポーリングで検知して
// 再生パイプラインをデッドロックから復帰させる
export const STALL_TIMEOUT_MS = 10_000;
// ストール監視のポーリング間隔
export const STALL_CHECK_INTERVAL_MS = 1_000;

export const safeRemoveListener = (
  listener: { remove: () => void } | null
): void => {
  try {
    listener?.remove();
  } catch {}
};

export const safeRemovePlayer = (player: AudioPlayer | null): void => {
  try {
    player?.pause();
    player?.remove();
  } catch {}
};

export interface PlayAudioHandle {
  player: AudioPlayer;
  listener: { remove: () => void };
}

export const playAudio = (options: {
  uri: string;
  onFinish: () => void;
  onError: (error: unknown) => void;
}): PlayAudioHandle => {
  const { uri, onFinish, onError } = options;
  const player = createAudioPlayer({ uri });

  let settled = false;
  let stalledTicks = 0;
  let lastCurrentTime = -1;
  const maxStalledTicks = Math.ceil(STALL_TIMEOUT_MS / STALL_CHECK_INTERVAL_MS);

  const statusListener = player.addListener(
    'playbackStatusUpdate',
    (status) => {
      if (status.didJustFinish) {
        settle(onFinish);
      } else if ('error' in status && status.error) {
        console.warn('[ttsAudioPlayer] playback error:', status.error);
        settle(() => onError(status.error));
      }
    }
  );

  const dispose = () => {
    clearInterval(watchdog);
    safeRemoveListener(statusListener);
  };

  const settle = (callback: () => void) => {
    if (settled) {
      return;
    }
    settled = true;
    dispose();
    callback();
  };

  // didJustFinishが届かないままプレイヤーが停止した場合の検知
  // （Androidのネイティブエラー・音声フォーカス喪失・バックグラウンド遷移など）
  const watchdog = setInterval(() => {
    try {
      const playing = player.playing;
      const currentTime = player.currentTime;
      if (playing || currentTime !== lastCurrentTime) {
        lastCurrentTime = currentTime;
        stalledTicks = 0;
        return;
      }
      stalledTicks += 1;
      if (stalledTicks >= maxStalledTicks) {
        console.warn('[ttsAudioPlayer] playback stalled, aborting:', uri);
        settle(() => onError(new Error('Playback stalled')));
      }
    } catch (e) {
      settle(() => onError(e));
    }
  }, STALL_CHECK_INTERVAL_MS);

  try {
    player.play();
  } catch (e) {
    settle(() => onError(e));
  }

  return { player, listener: { remove: dispose } };
};
