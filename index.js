import 'fast-text-encoding'

import { registerRootComponent } from 'expo'
import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'
import App from './src'
import { LOCATION_TASK_NAME } from './src/constants'
import { useLocationStore } from './src/hooks/useLocationStore'
;(async () => {
  try {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
    await TaskManager.unregisterAllTasksAsync()
  } catch (e) {
    console.warn(e)
  }

  TaskManager.defineTask(
    LOCATION_TASK_NAME,
    ({ data: { locations }, error }) => {
      if (error) {
        return
      }

      const curLocation = useLocationStore.getState().location
      if (
        curLocation?.timestamp !== locations[0]?.timestamp &&
        curLocation?.coords.latitude !== locations[0]?.coords.latitude &&
        curLocation?.coords.longitude !== locations[0]?.coords.longitude
      ) {
        useLocationStore.setState((state) => ({
          ...state,
          location: locations[0],
        }))
      }
    }
  )
})()

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in the Expo client or in a native build,
// the environment is set up appropriately
registerRootComponent(App)
