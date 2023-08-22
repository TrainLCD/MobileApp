import { ENABLE_FIREBASE_EMULATOR_ON_DEV } from 'react-native-dotenv'

export const shouldUseEmulator =
  __DEV__ && ENABLE_FIREBASE_EMULATOR_ON_DEV === 'true'
