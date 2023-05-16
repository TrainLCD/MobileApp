declare module 'react-native-dotenv' {
  export const APP_ENV: 'development' | 'staging' | 'production';
  export const API_URL: string;
  export const GOOGLE_API_KEY: string;
  export const NEARBY_STATIONS_LIMIT: string;
  export const MIRRORING_SHARE_DEEPLINK_URL: string;
  export const ENABLE_WDYR: 'true' | 'false';
  // production environment only
  export const DEV_MODE_API_URL: string | undefined;
  export const BLE_ENABLED: string;
  export const BLE_TARGET_LOCAL_NAME: string;
  export const BLE_TARGET_SERVICE_UUID: string;
  export const BLE_TARGET_CHARACTERISTIC_UUID: string;
}
