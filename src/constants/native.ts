import { Platform } from 'react-native';

export const IS_LIVE_ACTIVITIES_ELIGIBLE_PLATFORM =
  Platform.OS === 'ios' && Number.parseFloat(Platform.Version) >= 16.1;

export const IS_LIVE_UPDATE_ELIGIBLE_PLATFORM =
  Platform.OS === 'android' && (Platform.Version as number) >= 36;

// Android 16(API 36)以降ではフォアグラウンドサービス併走のJobにもクォータが適用される
export const NEEDS_JOBSCHEDULER_BYPASS =
  Platform.OS === 'android' && (Platform.Version as number) >= 36;
