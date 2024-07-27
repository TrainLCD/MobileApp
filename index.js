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
  if (
    curLocation?.coords.latitude === data.locations[0]?.coords.latitude &&
    curLocation?.coords.longitude === data.locations[0]?.coords.longitude
  ) {
    return BackgroundFetchResult.NoData
  }

  const now = dayjs()
  const stateTimestamp = curLocation && dayjs(curLocation.timestamp)
  const diffSeconds =
    (stateTimestamp && now.diff(stateTimestamp, 'seconds')) ?? 0
  if (diffSeconds < 1) {
    return BackgroundFetchResult.NoData
  }

  useLocationStore.setState((state) => ({
    ...state,
    location: data.locations[0],
  }))

  return BackgroundFetchResult.NewData
})
;(async () => {
  await TaskManager.unregisterAllTasksAsync()
})()

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in the Expo client or in a native build,
// the environment is set up appropriately
registerRootComponent(App)
