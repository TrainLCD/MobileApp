require('fast-text-encoding');

import { registerRootComponent } from 'expo';
import * as TaskManager from 'expo-task-manager';
import {
  NEW_RELIC_ANDROID_APP_TOKEN,
  NEW_RELIC_IOS_APP_TOKEN,
} from 'react-native-dotenv';
import App from './src';
import { LOCATION_TASK_NAME } from './src/constants';
import { setLocation } from './src/hooks/useLocationStore';

import NewRelic from 'newrelic-react-native-agent';
import { Platform } from 'react-native';
import * as appVersion from './package.json';

const appToken = Platform.select({
  ios: NEW_RELIC_IOS_APP_TOKEN,
  android: NEW_RELIC_ANDROID_APP_TOKEN,
});

const agentConfiguration = {
  analyticsEventEnabled: true,
  crashReportingEnabled: true,
  interactionTracingEnabled: true,
  networkRequestEnabled: true,
  networkErrorRequestEnabled: true,
  httpResponseBodyCaptureEnabled: true,
  loggingEnabled: true,
  logLevel: NewRelic.LogLevel.INFO,
  webViewInstrumentation: true,
};

NewRelic.startAgent(appToken, agentConfiguration);
NewRelic.setJSAppVersion(appVersion.version);

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
