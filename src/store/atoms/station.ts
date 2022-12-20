import { atom } from 'recoil';
import RECOIL_STATES from '../../constants/state';
import { LineDirection } from '../../models/Bound';
import { Station } from '../../models/StationAPI';

export interface StationState {
  arrived: boolean;
  approaching: boolean;
  station: Station | null;
  stations: Station[];
  scoredStations: Station[];
  fetchStationError: Error | null;
  fetchStationListError: Error | null;
  selectedDirection: LineDirection | null;
  selectedBound: Station | null;
  stationsWithTrainTypes: Station[];
}

export const initialStationState = {
  arrived: true,
  approaching: false,
  station: null,
  stations: [],
  scoredStations: [],
  fetchStationError: null,
  fetchStationListError: null,
  selectedDirection: null,
  selectedBound: null,
  stationsWithTrainTypes: [],
};

const stationState = atom<StationState>({
  key: RECOIL_STATES.station,
  default: initialStationState,
});

export default stationState;
