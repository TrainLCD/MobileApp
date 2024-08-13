import * as TaskManager from 'expo-task-manager'

if (!TaskManager.isTaskDefined(LOCATION_TASK_NAME)) {
  TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
    if (error) {
      console.error(error)
      return
    }

    setLocation(data.locations[0])
  })
}
TaskManager.unregisterAllTasksAsync().catch(console.error)

import 'fast-text-encoding'

import { registerRootComponent } from 'expo'
import App from './src'
import { LOCATION_TASK_NAME } from './src/constants'
import { setLocation } from './src/hooks/useLocationStore'

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in the Expo client or in a native build,
// the environment is set up appropriately
registerRootComponent(App)
