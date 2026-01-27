import notifee, {
  AndroidForegroundServiceType,
  AndroidImportance,
  EventType,
} from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { ASYNC_STORAGE_KEYS } from '~/constants/asyncStorage';
import { translate } from '~/translation';

const CHANNEL_ID = 'trainlcd-foreground-service';
const NOTIFICATION_ID = 'trainlcd-foreground-notification';

/**
 * フォアグラウンドサービスを起動する条件を満たしているかチェック
 * - バックグラウンド音声が有効
 * - 位置情報が常に許可されている
 */
const shouldStartForegroundService = async (): Promise<boolean> => {
  try {
    const [bgTtsEnabled, locationPermission] = await Promise.all([
      AsyncStorage.getItem(ASYNC_STORAGE_KEYS.BG_TTS_ENABLED),
      Location.getBackgroundPermissionsAsync(),
    ]);

    return bgTtsEnabled === 'true' && locationPermission.granted;
  } catch {
    return false;
  }
};

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
 * これによりDozeモードでも位置情報の更新が継続される
 * バックグラウンド音声が有効かつ位置情報が常に許可されている場合のみ起動
 */
export const startForegroundService = async (): Promise<void> => {
  if (Platform.OS !== 'android') {
    return;
  }

  // バックグラウンド音声が有効かつ位置情報が常に許可されている場合のみ起動
  const shouldStart = await shouldStartForegroundService();
  if (!shouldStart) {
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
          AndroidForegroundServiceType.FOREGROUND_SERVICE_TYPE_LOCATION,
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
