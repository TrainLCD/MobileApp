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

  const stateLat = useLocationStore.getState().location?.coords.latitude
  const stateLon = useLocationStore.getState().location?.coords.longitude
  const stateTimestamp = useLocationStore.getState().location?.timestamp
  const setLocation = useLocationStore.getState().setLocation

  if (
    stateLat === data.locations[0]?.coords.latitude &&
    stateLon === data.locations[0]?.coords.longitude
  ) {
    return BackgroundFetchResult.NoData
  }

  const receivedTimestamp =
    data.locations[0] && dayjs(data.locations[0].timestamp)
  const diffSeconds =
    stateTimestamp && receivedTimestamp.diff(stateTimestamp, 'seconds')
  if (!diffSeconds) return BackgroundFetchResult.NoData
  if (diffSeconds < 1) return BackgroundFetchResult.NoData

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
