import { NativeModules, Platform } from 'react-native';

const { IgnoreBatteryOptimizationsModule } = NativeModules;

export const requestIgnoreBatteryOptimizationsAndroid = (): Promise<void> => {
  if (Platform.OS !== 'android') {
    return Promise.resolve();
  }
  return IgnoreBatteryOptimizationsModule?.requestIgnoreBatteryOptimizations();
};
