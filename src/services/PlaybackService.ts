import TrackPlayer, { Event } from 'react-native-track-player';

export async function PlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePause, async () => {
    try {
      await TrackPlayer.pause();
    } catch (e) {
      console.warn('[PlaybackService] RemotePause error:', e);
    }
  });

  TrackPlayer.addEventListener(Event.RemotePlay, async () => {
    try {
      await TrackPlayer.play();
    } catch (e) {
      console.warn('[PlaybackService] RemotePlay error:', e);
    }
  });

  TrackPlayer.addEventListener(Event.RemoteStop, async () => {
    try {
      await TrackPlayer.stop();
      await TrackPlayer.reset();
    } catch (e) {
      console.warn('[PlaybackService] RemoteStop error:', e);
    }
  });

  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async () => {
    try {
      await TrackPlayer.reset();
    } catch (e) {
      console.warn('[PlaybackService] PlaybackQueueEnded error:', e);
    }
  });
}
