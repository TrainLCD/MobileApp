import { NativeModules, Platform } from 'react-native';


const { LiveActivityModule } = NativeModules;

const ELIGIBLE_PLATFORM =
  Platform.OS === 'ios' && parseFloat(Platform.Version) >= 16.1;


type LiveActivityWidgetState = {
  stationName: string;
  nextStationName: string;
  stationNumber: string;
  nextStationNumber: string;
  approaching: boolean;
  stopping: boolean;
  passingStationName: string;
  passingStationNumber: string;
};

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
