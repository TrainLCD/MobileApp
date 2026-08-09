import { atom } from 'jotai';

export type TuningState = {
  devOverlayEnabled: boolean;
  untouchableModeEnabled: boolean;
  telemetryEnabled: boolean;
};

const tuningState = atom<TuningState>({
  devOverlayEnabled: true,
  untouchableModeEnabled: false,
  telemetryEnabled: false,
});

export default tuningState;
