import { NativeModules, Platform } from 'react-native';

const { WearableModule } = NativeModules;

type StationInfoPayload = {
  stationName: string;
  stateKey: string;
  stationNumber: string;
  badAccuracy: boolean;
};

const sendStationInfoToWatch = (payload: StationInfoPayload): Promise<void> => {
  if (Platform.OS === 'ios') {
    return Promise.resolve();
  }
  return WearableModule.sendStationInfoToWatch(payload);
};

export default sendStationInfoToWatch;
