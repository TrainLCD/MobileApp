import { atom } from 'recoil';
import RECOIL_STATES from '../../constants/state';
import { LineDirection } from '../../models/Bound';
import { Station } from '../../models/StationAPI';

export interface StationState {
  arrived: boolean;
  approaching: boolean;
  station: Station;
  stations: Station[];
  scoredStations: Station[];
  fetchStationError: Error;
  fetchStationListError: Error;
  selectedDirection: LineDirection;
  selectedBound: Station;
}

const stationState = atom<StationState>({
  key: RECOIL_STATES.station,
  default: {
    arrived: false,
    approaching: false,
    station: null,
    stations: [],
    scoredStations: [],
    fetchStationError: null,
    fetchStationListError: null,
    selectedDirection: null,
    selectedBound: null,
  },
});

export default stationState;
