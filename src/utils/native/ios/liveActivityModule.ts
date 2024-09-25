import { NativeModules } from 'react-native';
import { IS_LIVE_ACTIVITIES_ELIGIBLE_PLATFORM } from '../../../constants';


const { LiveActivityModule } = NativeModules;



type LiveActivityWidgetState = {
  stationName: string;
  nextStationName: string;
  stationNumber: string;
  nextStationNumber: string;
  approaching: boolean;
  stopped: boolean;
  lineName:string
  lineColor:string
};

export const startLiveActivity = (
  state?: LiveActivityWidgetState
): (() => void) | null => {
  if (IS_LIVE_ACTIVITIES_ELIGIBLE_PLATFORM) {
    return LiveActivityModule?.startLiveActivity?.(state);
  }
  return null;
};

export const updateLiveActivity = (
  state: LiveActivityWidgetState
): (() => void) | null => {
  if (IS_LIVE_ACTIVITIES_ELIGIBLE_PLATFORM) {
    return LiveActivityModule?.updateLiveActivity?.(state);
  }
  return null;
};

export const stopLiveActivity = (
  state?: LiveActivityWidgetState
): (() => void) | null => {
  if (IS_LIVE_ACTIVITIES_ELIGIBLE_PLATFORM) {
    return LiveActivityModule?.stopLiveActivity?.(state);
  }
  return null;
};
