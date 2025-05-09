import * as Location from "expo-location";
import { useEffect } from "react";
import { AppState } from "react-native";
import { LOCATION_TASK_NAME, LOCATION_TASK_OPTIONS } from "../constants";
import { translate } from "../translation";
import { useApplicationFlagStore } from "./useApplicationFlagStore";
import { useLocationPermissionsGranted } from "./useLocationPermissionsGranted";
import { setLocation } from "./useLocationStore";

export const useStartBackgroundLocationUpdates = () => {
	const bgPermGranted = useLocationPermissionsGranted();
	const { autoModeEnabled } = useApplicationFlagStore();

	useEffect(() => {
		if (autoModeEnabled || !bgPermGranted) {
			return;
		}

		const startUpdateAsync = async () => {
			if (AppState.currentState === "active") {
				try {
					await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
						...LOCATION_TASK_OPTIONS,
						// NOTE: マップマッチが勝手に行われると電車での経路と大きく異なることがあるはずなので
						// OtherNavigationは必須
						activityType: Location.ActivityType.OtherNavigation,
						foregroundService: {
							notificationTitle: translate("bgAlertTitle"),
							notificationBody: translate("bgAlertContent"),
							killServiceOnDestroy: true,
						},
					});
				} catch (err) {}
			}
		};

		startUpdateAsync();

		return () => {
			Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
		};
	}, [autoModeEnabled, bgPermGranted]);

	useEffect(() => {
		let watchPositionSub: Location.LocationSubscription | null = null;

		(async () => {
			if (autoModeEnabled || bgPermGranted) {
				return;
			}

			try {
				watchPositionSub = await Location.watchPositionAsync(
					LOCATION_TASK_OPTIONS,
					setLocation,
				);
			} catch (err) {}
		})();

		return () => {
			watchPositionSub?.remove();
		};
	}, [autoModeEnabled, bgPermGranted]);
};
