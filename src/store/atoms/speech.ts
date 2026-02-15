import { atom } from 'jotai';
import { isDevApp } from '../../utils/isDevApp';

export interface StationState {
  enabled: boolean;
  backgroundEnabled: boolean;
  ttsEnabledLanguages: Array<'JA' | 'EN'>;
  monetizedPlanEnabled: boolean;
}

const speechState = atom<StationState>({
  enabled: false,
  backgroundEnabled: false,
  ttsEnabledLanguages: ['JA', 'EN'],
  monetizedPlanEnabled: isDevApp,
});

export default speechState;
