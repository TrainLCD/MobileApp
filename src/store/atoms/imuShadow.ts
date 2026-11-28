import { atomWithLazy } from 'jotai/vanilla/utils';
import { STORAGE_KEYS } from '~/constants/storage';
import { storage } from '~/lib/storage';

// Restore the opt-in before the ride screen chooses which IMU mode to use.
export const imuShadowEnabledAtom = atomWithLazy(
  () => storage.getString(STORAGE_KEYS.IMU_SHADOW_ENABLED) === 'true'
);
