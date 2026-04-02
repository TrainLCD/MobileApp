import { atom } from 'jotai';
import type {
  EstimationStatus,
  LocationLog,
  RouteCandidate,
} from '~/utils/routeEstimation/types';

export interface RouteEstimationState {
  status: EstimationStatus;
  candidates: RouteCandidate[];
  locationBuffer: LocationLog[];
  isEstimating: boolean;
}

const initialState: RouteEstimationState = {
  status: 'idle',
  candidates: [],
  locationBuffer: [],
  isEstimating: false,
};

const routeEstimationState = atom<RouteEstimationState>(initialState);

export default routeEstimationState;
