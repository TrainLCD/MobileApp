import 'fast-text-encoding'

import { registerRootComponent } from 'expo'
import * as TaskManager from 'expo-task-manager'
import App from './src'
import { LOCATION_TASK_NAME } from './src/constants'
import { useLocationStore } from './src/hooks/useLocationStore'

TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
  if (error) {
    console.error(error)
    return
  }

  const curLocation = useLocationStore.getState().location
  if (
    !data ||
    curLocation?.timestamp === data.locations[0]?.timestamp ||
    (curLocation?.coords.latitude === data.locations[0]?.coords.latitude &&
      curLocation?.coords.longitude === data.locations[0]?.coords.longitude)
  ) {
    return
  }

  useLocationStore.setState((state) => ({
    ...state,
    location: data.locations[0],
  }))
})

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in the Expo client or in a native build,
// the environment is set up appropriately
registerRootComponent(App)
