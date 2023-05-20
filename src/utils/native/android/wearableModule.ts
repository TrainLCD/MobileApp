import { NativeModules, Platform } from 'react-native';
import { Station } from '../../../models/StationAPI';

const { WearableModule } = NativeModules;

const sendStationInfoToWatch = (
  currentState: string,
  station: Station
): Promise<void> => {
  if (Platform.OS === 'ios') {
    return Promise.resolve();
  }
  return WearableModule.sendStationInfoToWatch(currentState, station.name);
};

export default sendStationInfoToWatch;
