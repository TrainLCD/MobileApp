import type * as Location from "expo-location";
import { create } from "zustand";

export const useLocationStore = create<Location.LocationObject | null>(
	() => null,
);

export const setLocation = (location: Location.LocationObject) =>
	useLocationStore.setState(location);
