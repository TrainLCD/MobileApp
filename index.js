import 'fast-text-encoding'

import { registerRootComponent } from 'expo'
import * as TaskManager from 'expo-task-manager'
import App from './src'
import { locationTaskName } from './src/utils/locationTaskName'

TaskManager.unregisterTaskAsync(locationTaskName).catch(console.debug)

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in the Expo client or in a native build,
// the environment is set up appropriately
registerRootComponent(App)
