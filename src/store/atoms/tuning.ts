import { atom } from 'jotai';
import {
  DEFAULT_BOTTOM_TRANSITION_INTERVAL,
  DEFAULT_HEADER_TRANSITION_DELAY,
  DEFAULT_HEADER_TRANSITION_INTERVAL,
} from '../../constants';

export type TuningState = {
  headerTransitionInterval: number;
  headerTransitionDelay: number;
  bottomTransitionInterval: number;
  devOverlayEnabled: boolean;
  untouchableModeEnabled: boolean;
  telemetryEnabled: boolean;
};

const tuningState = atom<TuningState>({
  headerTransitionInterval: DEFAULT_HEADER_TRANSITION_INTERVAL,
  headerTransitionDelay: DEFAULT_HEADER_TRANSITION_DELAY,
  bottomTransitionInterval: DEFAULT_BOTTOM_TRANSITION_INTERVAL,
  devOverlayEnabled: true,
  untouchableModeEnabled: false,
  telemetryEnabled: false,
});

// タッチ不可モードだけを見る購読者（MainStack など）が、他のチューニング値の
// 変更で再レンダーされないようにするための派生atom
export const untouchableModeEnabledAtom = atom(
  (get) => get(tuningState).untouchableModeEnabled
);

export default tuningState;
