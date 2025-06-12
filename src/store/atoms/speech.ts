import { atom } from 'jotai';
import { isDevApp } from '../../utils/isDevApp';

export interface StationState {
  enabled: boolean;
  backgroundEnabled: boolean;
  monetizedPlanEnabled: boolean;
}

const speechState = atom<StationState>({
  enabled: false,
  backgroundEnabled: false,
  monetizedPlanEnabled: isDevApp,
});

export default speechState;
