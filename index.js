require('fast-text-encoding');

import * as Sentry from '@sentry/react-native';
import { registerRootComponent } from 'expo';
import * as TaskManager from 'expo-task-manager';
import { SENTRY_DSN } from 'react-native-dotenv';
import App from './src';
import { LOCATION_TASK_NAME, MAX_PERMIT_ACCURACY } from './src/constants';
import { setLocation } from './src/hooks/useLocationStore';
import { fetch } from 'expo/fetch';

global.fetch = fetch;

if (!__DEV__) {
  Sentry.init({
    dsn: SENTRY_DSN,
    enableAutoSessionTracking: true,
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.mobileReplayIntegration({
        maskAllText: true,
        blockAllMedia: true,
        privacyOptions: {
          maskAllInputs: true,
          blockClass: ['sensitive-screen', 'payment-view'],
        },
      }),
    ],
  });
}

if (!TaskManager.isTaskDefined(LOCATION_TASK_NAME)) {
  TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
    if (error) {
      console.error(error);
      return;
    }

    const latestLocation = data.locations[data.locations.length - 1];
    const bestAccuracyLocation = data.locations.reduce((best, cur) => {
      if (best.coords.accuracy > cur.coords.accuracy) {
        return cur;
      }
      return best;
    }, latestLocation);
    if (bestAccuracyLocation) {
      if (bestAccuracyLocation.coords.accuracy > MAX_PERMIT_ACCURACY) {
        return;
      }
      setLocation(bestAccuracyLocation);
    }
  });
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in the Expo client or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
