declare module 'react-native-dotenv' {
  export const APP_ENV: 'development' | 'production'
  export const GOOGLE_API_KEY: string
  export const NEARBY_STATIONS_LIMIT: string
  export const MIRRORING_SHARE_DEEPLINK_URL: string
  export const DEV_API_URL: string
  export const PRODUCTION_API_URL: string
  export const STAGING_API_URL: string
  export const ENABLE_FIREBASE_EMULATOR_ON_DEV: string
  export const BLE_ENABLED: string
  export const BLE_TARGET_LOCAL_NAME: string
  export const BLE_TARGET_SERVICE_UUID: string
  export const BLE_TARGET_CHARACTERISTIC_UUID: string
}
