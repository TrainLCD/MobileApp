import 'fast-text-encoding'

import dayjs from 'dayjs'
import { registerRootComponent } from 'expo'
import { BackgroundFetchResult } from 'expo-background-fetch'
import * as TaskManager from 'expo-task-manager'
import App from './src'
import { useLocationStore } from './src/hooks/useLocationStore'
import { locationTaskName } from './src/utils/locationTaskName'

TaskManager.defineTask(locationTaskName, ({ data, error }) => {
  if (error) {
    console.error(error)
    return BackgroundFetchResult.Failed
  }

  const curLocation = useLocationStore.getState().location
  const setLocation = useLocationStore.getState().setLocation

  if (
    curLocation?.coords.latitude === data.locations[0]?.coords.latitude &&
    curLocation?.coords.longitude === data.locations[0]?.coords.longitude
  ) {
    return BackgroundFetchResult.NoData
  }

  const receivedTimestamp =
    data.locations[0] && dayjs(data.locations[0].timestamp)
  const stateTimestamp = curLocation && dayjs(curLocation.timestamp)
  const diffSeconds =
    (stateTimestamp && receivedTimestamp.diff(stateTimestamp, 'seconds')) ?? 0
  if (diffSeconds < 1) {
    return BackgroundFetchResult.NoData
  }

  setLocation(data.locations[0])

  return BackgroundFetchResult.NewData
})
;(async () => {
  await TaskManager.unregisterAllTasksAsync()
})()

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in the Expo client or in a native build,
// the environment is set up appropriately
registerRootComponent(App)
