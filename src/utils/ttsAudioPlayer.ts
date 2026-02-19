import type { AudioPlayer } from 'expo-audio';
import { createAudioPlayer } from 'expo-audio';

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

  const listener = player.addListener('playbackStatusUpdate', (status) => {
    if (status.didJustFinish) {
      safeRemoveListener(listener);
      onFinish();
    } else if ('error' in status && status.error) {
      console.warn('[ttsAudioPlayer] playback error:', status.error);
      safeRemoveListener(listener);
      onError(status.error);
    }
  });

  try {
    player.play();
  } catch (e) {
    safeRemoveListener(listener);
    onError(e);
  }

  return { player, listener };
};
