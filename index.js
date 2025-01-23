require('fast-text-encoding');

import { registerRootComponent } from 'expo';
import * as TaskManager from 'expo-task-manager';
import App from './src';
import { LOCATION_TASK_NAME } from './src/constants';
import { setLocation } from './src/hooks/useLocationStore';

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
