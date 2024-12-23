require('fast-text-encoding')

import * as TaskManager from 'expo-task-manager'

TaskManager.unregisterAllTasksAsync().catch(console.error)

const PERMISSIBLE_DELAY_IN_MS = 500
let lastTimestamp = 0

if (!TaskManager.isTaskDefined(LOCATION_TASK_NAME)) {
  TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
    if (error) {
      console.error(error)
      return
    }

    const latestTimestamp = data.locations[0]?.timestamp ?? 0
    if (lastTimestamp < latestTimestamp + PERMISSIBLE_DELAY_IN_MS) {
      setLocation(data.locations[0])
      lastTimestamp = latestTimestamp
    }
  })
}

import { registerRootComponent } from 'expo'
import App from './src'
import { LOCATION_TASK_NAME } from './src/constants'
import { setLocation } from './src/hooks/useLocationStore'

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in the Expo client or in a native build,
// the environment is set up appropriately
registerRootComponent(App)
