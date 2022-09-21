import { NativeModules, Platform } from 'react-native';

const { LiveActivityModule } = NativeModules;

type LiveActivityWidgetState = {
  stationName: string;
  nextStationName: string;
  stationNumber: string;
  nextStationNumber: string;
  runningState: string;
  stopping: boolean;
};

export const startLiveActivity = (
  state: LiveActivityWidgetState
): (() => void) | null => {
  if (Platform.OS === 'ios') {
    return LiveActivityModule.startLiveActivity(state);
  }
  return null;
};

export const updateLiveActivity = (
  state: LiveActivityWidgetState
): (() => void) | null => {
  if (Platform.OS === 'ios') {
    return LiveActivityModule.updateLiveActivity(state);
  }
  return null;
};

export const stopLiveActivity = (
  state: LiveActivityWidgetState
): (() => void) | null => {
  if (Platform.OS === 'ios') {
    return LiveActivityModule.stopLiveActivity(state);
  }
  return null;
};
