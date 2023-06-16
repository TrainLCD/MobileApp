import { getBundleId } from 'react-native-device-info'

const DEV_APP_BUNDLE_IDENTIFIER = 'me.tinykitten.trainlcd.dev'

export const isDevApp = (() => getBundleId() === DEV_APP_BUNDLE_IDENTIFIER)()
export const isDevAppOrDebugging = __DEV__ || isDevApp
