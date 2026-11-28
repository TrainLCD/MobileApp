import { atom } from 'jotai';
import { atomWithLazy } from 'jotai/vanilla/utils';
import { STORAGE_KEYS } from '~/constants/storage';
import type { StopTrialPhase } from '~/lib/imuStopTrial';
import { storage } from '~/lib/storage';

// Restore the opt-in before the ride screen chooses which IMU mode to use.
export const imuShadowEnabledAtom = atomWithLazy(
  () => storage.getString(STORAGE_KEYS.IMU_SHADOW_ENABLED) === 'true'
);

// The foreground recorder owns the native sensor while shadow mode is enabled.
// Publish only phase changes so ride guidance can use that same sensor stream.
export const recordedRidePhaseAtom = atom<{
  phase: StopTrialPhase;
  timeMs: number;
} | null>(null);
