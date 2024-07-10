import 'fast-text-encoding'

import { registerRootComponent } from 'expo'
import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'
import App from './src'
import { LOCATION_TASK_NAME } from './src/constants'
import { useLocationStore } from './src/hooks/useLocationStore'
;(async () => {
  await TaskManager.unregisterAllTasksAsync()

  const isUpdatesStarted = await Location.hasStartedLocationUpdatesAsync(
    LOCATION_TASK_NAME
  )
  if (isUpdatesStarted) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
  }

  TaskManager.defineTask(
    LOCATION_TASK_NAME,
    ({ data: { locations }, error }) => {
      if (error) {
        return
      }

      const curLocation = useLocationStore.getState().location
      // 多分暴走してる
      if (curLocation?.timestamp === locations[0]?.timestamp) {
        return
      }

      useLocationStore.setState((state) => ({
        ...state,
        location: locations[0],
      }))
    }
  )
})()

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in the Expo client or in a native build,
// the environment is set up appropriately
registerRootComponent(App)
