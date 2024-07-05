import 'fast-text-encoding'

import { registerRootComponent } from 'expo'
import * as TaskManager from 'expo-task-manager'
import App from './src'
import { LOCATION_TASK_NAME } from './src/constants'
import { useLocationStore } from './src/hooks/useLocationStore'

const isTaskDefined = TaskManager.isTaskDefined(LOCATION_TASK_NAME)

if (!isTaskDefined) {
  TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
    if (error) {
      console.error(error)
      return
    }
    if (data) {
      const { locations } = data
      useLocationStore.setState(() => ({
        location: locations[0],
      }))
    }
  })
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in the Expo client or in a native build,
// the environment is set up appropriately
registerRootComponent(App)
