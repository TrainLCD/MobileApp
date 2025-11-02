import type * as Location from 'expo-location';
import { create } from 'zustand';

const MAX_ACCURACY_HISTORY = 12;

type LocationStoreState = {
  location: Location.LocationObject | null;
  accuracyHistory: number[];
};

export const useLocationStore = create<LocationStoreState>(() => ({
  location: null,
  accuracyHistory: [],
}));

export const setLocation = (location: Location.LocationObject) => {
  const currentHistory = useLocationStore.getState().accuracyHistory;
  const newAccuracy = location.coords.accuracy;

  // Only add to history if accuracy is a valid number
  const updatedHistory =
    newAccuracy != null
      ? [...currentHistory, newAccuracy].slice(-MAX_ACCURACY_HISTORY)
      : currentHistory;

  useLocationStore.setState({
    location,
    accuracyHistory: updatedHistory,
  });
};
