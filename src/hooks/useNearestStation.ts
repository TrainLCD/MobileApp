import findNearest from "geolib/es/findNearest";
import { useMemo } from "react";
import { useRecoilValue } from "recoil";
import { Station } from "../../gen/proto/stationapi_pb";
import stationState from "../store/atoms/station";
import { useLocationStore } from "./useLocationStore";

export const useNearestStation = (): Station | null => {
	const latitude = useLocationStore((state) => state?.coords.latitude);
	const longitude = useLocationStore((state) => state?.coords.longitude);
	const { stations } = useRecoilValue(stationState);

	const nearestStation = useMemo<Station | null>(() => {
		if (!latitude || !longitude) {
			return null;
		}

		const nearestCoordinates = stations.length
			? (findNearest(
					{
						latitude,
						longitude,
					},
					stations.map((sta) => ({
						latitude: sta.latitude,
						longitude: sta.longitude,
					})),
				) as { latitude: number; longitude: number })
			: null;

		if (!nearestCoordinates) {
			return null;
		}

		const nearestStations = stations.filter(
			(sta) =>
				sta.latitude === nearestCoordinates.latitude &&
				sta.longitude === nearestCoordinates.longitude,
		);

		// NOTE: 都営大江戸線特例
		if (
			// NOTE: どちらのIDも都庁前
			nearestStations[0]?.id === 9930100 &&
			nearestStations[1]?.id === 9930101
		) {
			return nearestStations.slice().reverse()[0];
		}

		return nearestStations[0] ?? null;
	}, [latitude, longitude, stations]);

	return nearestStation;
};
