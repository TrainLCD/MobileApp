import { atom } from 'recoil';
import RECOIL_STATES from '../../constants/state';
import { LineDirection } from '../../models/Bound';
import { Station } from '../../models/StationAPI';

export interface StationState {
  arrived: boolean;
  approaching: boolean;
  station: Station | null;
  stations: Station[];
  rawStations: Station[];
  scoredStations: Station[];
  fetchStationError: Error | null;
  fetchStationListError: Error | null;
  selectedDirection: LineDirection | null;
  selectedBound: Station | null;
  stationsWithTrainTypes: Station[];
}

const stationState = atom<StationState>({
  key: RECOIL_STATES.station,
  default: {
    arrived: true,
    approaching: false,
    station: null,
    stations: [],
    rawStations: [],
    scoredStations: [],
    fetchStationError: null,
    fetchStationListError: null,
    selectedDirection: null,
    selectedBound: null,
    stationsWithTrainTypes: [],
  },
});

export default stationState;
