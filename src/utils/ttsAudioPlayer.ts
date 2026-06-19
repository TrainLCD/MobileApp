import type { AudioPlayer } from 'expo-audio';
import { createAudioPlayer } from 'expo-audio';

// 再生位置が進まない状態がこの時間続いたらストールとみなして打ち切る
// Android(ExoPlayer)は再生エラーや音声フォーカス喪失で停止しても
// JSへerrorイベントもdidJustFinishも届かないため、ポーリングで検知して
// 再生パイプラインをデッドロックから復帰させる
export const STALL_TIMEOUT_MS = 10_000;
// ストール監視のポーリング間隔
export const STALL_CHECK_INTERVAL_MS = 1_000;

// didJustFinish 受信時、再生位置がこの秒数以内まで終端へ達していれば正常終了とみなす。
// iOS は長尺音声で、音声セッションの一時中断やデコード境界などにより本来の終端より
// 手前で didJustFinish を誤報することがある。これをそのまま「完了」と扱うと、日本語
// アナウンスが途中で打ち切られて次（英語）へ飛んでしまうため、終端付近に達していない
// 完了報告は早期完了とみなして再生を継続する。
export const FINISH_END_EPSILON_SEC = 0.5;
// 早期 didJustFinish からの再開を試みる最大回数（誤検知時の無限ループを防ぐ安全弁）
export const MAX_RESUME_ATTEMPTS = 5;

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
  // 既存プレイヤーを渡すと再生成せず replace() で音源だけ差し替える。
  // 再生のたびに createAudioPlayer すると Android の ExoPlayer/AudioTrack が
  // 解放しきれず蓄積し、AudioFlinger がトラックを作れなくなって
  // (status -12 / NO_MEMORY) TTS が完全停止するため、プレイヤーは使い回す。
  player?: AudioPlayer | null;
  onFinish: () => void;
  onError: (error: unknown) => void;
}): PlayAudioHandle => {
  const { uri, onFinish, onError } = options;
  const reusing = Boolean(options.player);
  const player = options.player ?? createAudioPlayer({ uri });

  let settled = false;
  let stalledTicks = 0;
  let lastCurrentTime = -1;
  let resumeAttempts = 0;
  const maxStalledTicks = Math.ceil(STALL_TIMEOUT_MS / STALL_CHECK_INTERVAL_MS);

  // 終端付近に達していない didJustFinish（iOS の早期完了誤報）を「正常終了」と
  // 扱わないためのガード。位置が取れる場合はその位置から再開して打ち切りを防ぎ、
  // 位置が取れない/終端付近の場合は従来どおり完了として進む（=最悪でも現状維持）。
  const handleDidJustFinish = (status: {
    currentTime?: number;
    duration?: number;
    playbackState?: string;
    reasonForWaitingToPlay?: string;
  }) => {
    const duration = status.duration || player.duration || 0;
    const position = status.currentTime ?? player.currentTime ?? 0;
    const reachedEnd =
      duration <= 0 || position >= duration - FINISH_END_EPSILON_SEC;

    if (!reachedEnd) {
      // 早期完了の実測値をログに残す（実機での原因特定と再開判定の検証用）
      console.warn(
        `[ttsAudioPlayer] early didJustFinish at ${position.toFixed(2)}/${duration.toFixed(2)}s ` +
          `(state=${status.playbackState ?? 'n/a'}, waiting=${status.reasonForWaitingToPlay ?? 'n/a'}):`,
        uri
      );
      // 位置が取れていれば、その位置から再開して途中打ち切りを防ぐ。
      // 位置が 0（=リセット報告）だと頭から再生し直しになるため再開しない。
      if (position > 0 && resumeAttempts < MAX_RESUME_ATTEMPTS) {
        resumeAttempts += 1;
        // 再開直後はストール監視を誤発火させないようカウンタを戻す
        stalledTicks = 0;
        lastCurrentTime = -1;
        try {
          // didJustFinish で位置が末尾/0 へ移動する実装に備え、明示的に戻してから再生
          player.seekTo(position).catch(() => {});
          player.play();
        } catch (e) {
          settle(() => onError(e));
        }
        return;
      }
    }
    settle(onFinish);
  };

  const statusListener = player.addListener(
    'playbackStatusUpdate',
    (status) => {
      if (status.didJustFinish) {
        handleDidJustFinish(status);
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
    if (reusing) {
      // 前回再生の途中状態を確実にリセットしてから音源を差し替える
      player.pause();
      player.replace({ uri });
    }
    player.play();
  } catch (e) {
    settle(() => onError(e));
  }

  return { player, listener: { remove: dispose } };
};
