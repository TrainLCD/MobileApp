import type * as Location from 'expo-location';
import { atom } from 'jotai';
import { store } from '..';

const MAX_ACCURACY_HISTORY = 12;

export const locationAtom = atom<Location.LocationObject | null>(null);
export const accuracyHistoryAtom = atom<number[]>([]);

export const setLocation = (location: Location.LocationObject) => {
  const currentHistory = store.get(accuracyHistoryAtom);
  const newAccuracy = location.coords.accuracy;

  const updatedHistory =
    newAccuracy != null && Number.isFinite(newAccuracy) && newAccuracy >= 0
      ? [...currentHistory, newAccuracy].slice(-MAX_ACCURACY_HISTORY)
      : currentHistory;

  store.set(locationAtom, location);
  store.set(accuracyHistoryAtom, updatedHistory);
};
