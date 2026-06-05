import * as Sentry from '@sentry/react-native';
import { registerRootComponent } from 'expo';
import * as TaskManager from 'expo-task-manager';
import { SENTRY_DSN } from 'react-native-dotenv';
import App from './src';
import { LOCATION_TASK_NAME } from './src/constants';
import { setupRemoteConfig } from './src/lib/remoteConfig';
import { handleTrackingLocation } from './src/utils/handleTrackingLocation';

Sentry.init({
  dsn: SENTRY_DSN,
  tracesSampleRate: 0.1,
  profilesSampleRate: 0.02,
});

// Remote Config の既定値登録とフェッチを起動時に一度だけ走らせる。
// フォアグラウンド・ヘッドレス（バックグラウンド測位タスク）双方の起動経路を
// 単一のエントリポイントでカバーする。失敗してもアプリは既定値で動作するため、
// Sentry へ報告するに留めて起動はブロックしない。
setupRemoteConfig().catch((error) => {
  Sentry.captureException(error);
});

if (!TaskManager.isTaskDefined(LOCATION_TASK_NAME)) {
  TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
    if (error) {
      console.error(error);
      return;
    }

    const latestLocation = data.locations[data.locations.length - 1];
    if (latestLocation) {
      handleTrackingLocation(latestLocation);
    }
  });
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in the Expo client or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
