import { atom } from 'jotai';
import type { Station } from '~/@types/graphql';
import type { LineDirection } from '../../models/Bound';

export interface StationState {
  arrived: boolean;
  approaching: boolean;
  station: Station | null;
  stations: Station[];
  stationsCache: Station[][];
  pendingStation: Station | null;
  pendingStations: Station[];
  selectedDirection: LineDirection | null;
  selectedBound: Station | null;
  wantedDestination: Station | null;
}

const initialStationState: StationState = {
  arrived: true,
  approaching: false,
  station: null,
  stations: [],
  stationsCache: [],
  pendingStation: null,
  pendingStations: [],
  selectedDirection: null,
  selectedBound: null,
  wantedDestination: null,
};

const stationState = atom<StationState>(initialStationState);

export default stationState;
