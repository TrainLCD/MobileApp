import 'fast-text-encoding'

import { registerRootComponent } from 'expo'
import * as TaskManager from 'expo-task-manager'
import App from './src'
import { useLocationStore } from './src/hooks/useLocationStore'
import { locationTaskName } from './src/utils/locationTaskName'

TaskManager.defineTask(locationTaskName, ({ data, error }) => {
  if (error) {
    console.error(error)
    return
  }

  const stateLat = useLocationStore.getState().location?.coords.latitude
  const stateLon = useLocationStore.getState().location?.coords.longitude

  if (
    stateLat === data.locations[0]?.coords.latitude &&
    stateLon === data.locations[0]?.coords.longitude
  ) {
    return
  }

  useLocationStore.setState(data.locations[0])
})
;(async () => {
  await TaskManager.unregisterAllTasksAsync()
})()

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in the Expo client or in a native build,
// the environment is set up appropriately
registerRootComponent(App)
