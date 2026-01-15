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
  lineName: string;
  lineColor: string;
  passingStationName: string;
  passingStationNumber: string;
  stationIndex: number;
  totalStations: number;
};

export const startLiveActivity = (state?: LiveActivityWidgetState) => {
  if (IS_LIVE_ACTIVITIES_ELIGIBLE_PLATFORM) {
    LiveActivityModule?.startLiveActivity?.(state);
  }
};

export const updateLiveActivity = (state: LiveActivityWidgetState) => {
  if (IS_LIVE_ACTIVITIES_ELIGIBLE_PLATFORM) {
    LiveActivityModule?.updateLiveActivity?.(state);
  }
};

export const stopLiveActivity = (state?: LiveActivityWidgetState) => {
  if (IS_LIVE_ACTIVITIES_ELIGIBLE_PLATFORM) {
    LiveActivityModule?.stopLiveActivity?.(state);
  }
};
