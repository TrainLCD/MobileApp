require('fast-text-encoding');

import * as Sentry from '@sentry/react-native';
import { registerRootComponent } from 'expo';
import * as TaskManager from 'expo-task-manager';
import { SENTRY_DSN } from 'react-native-dotenv';
import App from './src';
import { LOCATION_TASK_NAME } from './src/constants';
import { setLocation } from './src/hooks/useLocationStore';

Sentry.init({
  dsn: SENTRY_DSN,
  enableAutoSessionTracking: true,
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
});

if (!TaskManager.isTaskDefined(LOCATION_TASK_NAME)) {
  TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
    if (error) {
      console.error(error);
      return;
    }

    const latestLocation = data.locations[data.locations.length - 1];
    if (latestLocation) {
      setLocation(latestLocation);
    }
  });
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in the Expo client or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
