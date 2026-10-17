import type { LocationObject } from 'expo-location';
import { atom } from 'jotai';
import type { Station } from '~/@types/graphql';

// 補正前の測位が再レンダーで再適用されるのを防ぐ。新しい測位または経路では解除する。
export const manualStationCorrectionAtom = atom<{
  location: LocationObject | null;
  stations: Station[];
} | null>(null);
