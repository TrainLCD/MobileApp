import { NativeModules, Platform, PlatformIOSStatic } from 'react-native';

const { isPad } = Platform as PlatformIOSStatic;

const { LiveActivityModule } = NativeModules;

type LiveActivityWidgetState = {
  stationName: string;
  nextStationName: string;
  stationNumber: string;
  nextStationNumber: string;
  runningState: string;
  stopping: boolean;
};

const ELIGIBLE_PLATFORM =
  Platform.OS === 'ios' && parseFloat(Platform.Version) >= 16.1 && !isPad;

export const startLiveActivity = (
  state?: LiveActivityWidgetState
): (() => void) | null => {
  if (ELIGIBLE_PLATFORM) {
    return LiveActivityModule?.startLiveActivity?.(state);
  }
  return null;
};

export const updateLiveActivity = (
  state: LiveActivityWidgetState
): (() => void) | null => {
  if (ELIGIBLE_PLATFORM) {
    return LiveActivityModule?.updateLiveActivity?.(state);
  }
  return null;
};

export const stopLiveActivity = (
  state?: LiveActivityWidgetState
): (() => void) | null => {
  if (ELIGIBLE_PLATFORM) {
    return LiveActivityModule?.stopLiveActivity?.(state);
  }
  return null;
};
