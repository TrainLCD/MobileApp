import { atom } from 'jotai';
import type { Station } from '~/@types/graphql';
import type { LineDirection } from '../../models/Bound';

export interface StationState {
  arrived: boolean;
  approaching: boolean;
  station: Station | null;
  stations: Station[];
  selectedDirection: LineDirection | null;
  selectedBound: Station | null;
  wantedDestination: Station | null;
}

const initialStationState: StationState = {
  arrived: true,
  approaching: false,
  station: null,
  stations: [],
  selectedDirection: null,
  selectedBound: null,
  wantedDestination: null,
};

const stationState = atom<StationState>(initialStationState);

export default stationState;
