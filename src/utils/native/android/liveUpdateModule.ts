import { NativeModules } from 'react-native';
import { IS_LIVE_UPDATE_ELIGIBLE_PLATFORM } from '../../../constants';

const { LiveUpdateModule } = NativeModules;

type LiveUpdateState = {
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
  progress: number;
  boundStationName: string;
  trainTypeName: string;
};

export const startLiveUpdate = (state?: LiveUpdateState) => {
  if (IS_LIVE_UPDATE_ELIGIBLE_PLATFORM) {
    LiveUpdateModule?.startLiveUpdate?.(state);
  }
};

export const updateLiveUpdate = (state: LiveUpdateState) => {
  if (IS_LIVE_UPDATE_ELIGIBLE_PLATFORM) {
    LiveUpdateModule?.updateLiveUpdate?.(state);
  }
};

export const stopLiveUpdate = () => {
  if (IS_LIVE_UPDATE_ELIGIBLE_PLATFORM) {
    LiveUpdateModule?.stopLiveUpdate?.();
  }
};
