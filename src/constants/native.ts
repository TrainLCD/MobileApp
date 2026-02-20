import { Platform } from 'react-native';

export const IS_LIVE_ACTIVITIES_ELIGIBLE_PLATFORM =
  Platform.OS === 'ios' && Number.parseFloat(Platform.Version) >= 16.1;

export const IS_LIVE_UPDATE_ELIGIBLE_PLATFORM =
  Platform.OS === 'android' && (Platform.Version as number) >= 36;
