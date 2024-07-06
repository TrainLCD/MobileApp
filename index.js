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

  useLocationStore.setState((state) => {
    if (!data || state.location?.timestamp === data.locations[0]?.timestamp) {
      return state
    }

    return { ...state, location: data.locations[0] }
  })
})

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in the Expo client or in a native build,
// the environment is set up appropriately
registerRootComponent(App)
