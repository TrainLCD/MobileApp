import { atom } from 'recoil';
import { RECOIL_STATES } from '../../constants';
import { isDevApp } from '../../utils/isDevApp';

export interface StationState {
  enabled: boolean;
  backgroundEnabled: boolean;
  monetizedPlanEnabled: boolean;
}

const speechState = atom<StationState>({
  key: RECOIL_STATES.speech,
  default: {
    enabled: false,
    backgroundEnabled: false,
    monetizedPlanEnabled: isDevApp,
  },
});

export default speechState;
