import { atom } from 'recoil';
import RECOIL_STATES from '../../constants/state';
import { GPXData } from '../../utils/gpxBuilder';

export interface RecordRouteState {
  recordingEnabled: boolean;
  routeName: string | null;
  locationHistory: GPXData[];
}

const recordRouteState = atom<RecordRouteState>({
  key: RECOIL_STATES.recordRoute,
  default: {
    recordingEnabled: false,
    routeName: null,
    locationHistory: [],
  },
});

export default recordRouteState;
