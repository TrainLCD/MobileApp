import 'fast-text-encoding'

import dayjs from 'dayjs'
import { registerRootComponent } from 'expo'
import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'
import App from './src'
import { useLocationStore } from './src/hooks/useLocationStore'
import { locationTaskName } from './src/utils/locationTaskName'

TaskManager.defineTask(locationTaskName, ({ data, error }) => {
  if (error) {
    console.error(error)
    return
  }

  const curLocation = useLocationStore.getState().location
  if (
    curLocation?.coords.latitude === data.locations[0]?.coords.latitude &&
    curLocation?.coords.longitude === data.locations[0]?.coords.longitude
  ) {
    return
  }

  const now = dayjs()
  const stateTimestamp = curLocation && dayjs(curLocation.timestamp)
  if (stateTimestamp && now.diff(stateTimestamp, 'seconds') < 1) {
    return
  }

  useLocationStore.setState((state) => ({
    ...state,
    location: data.locations[0],
  }))
})
;(async () => {
  await TaskManager.unregisterAllTasksAsync()
  await Location.stopLocationUpdatesAsync(locationTaskName)
})()

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in the Expo client or in a native build,
// the environment is set up appropriately
registerRootComponent(App)
