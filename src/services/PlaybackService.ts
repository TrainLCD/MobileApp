import TrackPlayer, {
  Event,
  type EmitterSubscription,
} from 'react-native-track-player';

const subscriptions: EmitterSubscription[] = [];

export async function PlaybackService() {
  // 既存のサブスクリプションをクリーンアップ
  for (const sub of subscriptions) {
    sub.remove();
  }
  subscriptions.length = 0;

  subscriptions.push(
    TrackPlayer.addEventListener(Event.RemotePause, async () => {
      try {
        await TrackPlayer.pause();
      } catch (e) {
        console.warn('[PlaybackService] RemotePause error:', e);
      }
    })
  );

  subscriptions.push(
    TrackPlayer.addEventListener(Event.RemotePlay, async () => {
      try {
        await TrackPlayer.play();
      } catch (e) {
        console.warn('[PlaybackService] RemotePlay error:', e);
      }
    })
  );

  subscriptions.push(
    TrackPlayer.addEventListener(Event.RemoteStop, async () => {
      try {
        await TrackPlayer.stop();
        await TrackPlayer.reset();
      } catch (e) {
        console.warn('[PlaybackService] RemoteStop error:', e);
      }
    })
  );

  subscriptions.push(
    TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async () => {
      try {
        await TrackPlayer.reset();
      } catch (e) {
        console.warn('[PlaybackService] PlaybackQueueEnded error:', e);
      }
    })
  );
}
