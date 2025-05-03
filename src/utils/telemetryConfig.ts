import { ENABLE_EXPERIMENTAL_TELEMETRY } from 'react-native-dotenv';

// NOTE: ユニットテストのモック用に切り出している
export const isTelemetryEnabled =
  __DEV__ && ENABLE_EXPERIMENTAL_TELEMETRY === 'true';
