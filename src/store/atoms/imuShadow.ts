import { atom } from 'jotai';

// The experiment is deliberately opt-in for each app process.
export const imuShadowEnabledAtom = atom(false);
