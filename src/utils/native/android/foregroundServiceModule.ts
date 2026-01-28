import notifee, {
  AndroidForegroundServiceType,
  AndroidImportance,
  EventType,
} from '@notifee/react-native';
import { Platform } from 'react-native';
import { translate } from '~/translation';

const CHANNEL_ID = 'trainlcd-foreground-service';
const NOTIFICATION_ID = 'trainlcd-foreground-notification';

/**
 * 通知チャンネルを作成
 * Android 8.0以降で必須
 */
export const createNotificationChannel = async (): Promise<void> => {
  if (Platform.OS !== 'android') {
    return;
  }

  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'TrainLCD Background Service',
    importance: AndroidImportance.LOW,
    // 音とバイブレーションを無効化（常時表示の通知なので）
    sound: undefined,
    vibration: false,
  });
};

/**
 * Androidフォアグラウンドサービスを開始
 * バックグラウンドでのメディア再生（TTS）を継続するために使用
 * 位置情報の更新はexpo-locationのforegroundServiceで処理する
 */
export const startForegroundService = async (): Promise<void> => {
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    await createNotificationChannel();

    await notifee.displayNotification({
      id: NOTIFICATION_ID,
      title: translate('bgAlertTitle'),
      body: translate('bgAlertContent'),
      android: {
        channelId: CHANNEL_ID,
        asForegroundService: true,
        foregroundServiceTypes: [
          AndroidForegroundServiceType.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK,
        ],
        importance: AndroidImportance.LOW,
        // 通知を常に表示（スワイプで消せない）
        ongoing: true,
        // ロック画面でも表示
        visibility: 0, // PRIVATE
        // 小さいアイコン（指定しない場合はアプリのアイコンが使用される）
        // 通知をタップした時にアプリを開く
        pressAction: {
          id: 'default',
        },
      },
    });
  } catch (error) {
    console.warn('フォアグラウンドサービスの開始に失敗しました:', error);
  }
};

/**
 * フォアグラウンドサービスを停止
 */
export const stopForegroundService = async (): Promise<void> => {
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    await notifee.stopForegroundService();
  } catch (error) {
    console.warn('フォアグラウンドサービスの停止に失敗しました:', error);
  }
};

/**
 * フォアグラウンドサービスが実行中かどうかを確認
 */
export const isForegroundServiceRunning = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return false;
  }

  try {
    const notifications = await notifee.getDisplayedNotifications();
    return notifications.some(
      (n) =>
        n.id === NOTIFICATION_ID &&
        n.notification?.android?.asForegroundService === true
    );
  } catch {
    return false;
  }
};

/**
 * notifeeバックグラウンドイベントハンドラ
 * フォアグラウンドサービスのイベントを処理
 */
export const onBackgroundEvent = async ({
  type,
  detail,
}: {
  type: EventType;
  detail: { notification?: { id?: string }; pressAction?: { id: string } };
}): Promise<void> => {
  // フォアグラウンドサービスの通知がタップされた場合
  if (type === EventType.PRESS && detail.notification?.id === NOTIFICATION_ID) {
    // アプリがフォアグラウンドに移動する（デフォルト動作）
    return;
  }

  // フォアグラウンドサービスの通知が閉じられた場合（通常は発生しない、ongoingなので）
  if (
    type === EventType.DISMISSED &&
    detail.notification?.id === NOTIFICATION_ID
  ) {
    // サービスを再開する
    await startForegroundService();
  }
};
