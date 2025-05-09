import { useMemo } from "react";
import { useRecoilValue } from "recoil";
import type { Station } from "../../gen/proto/stationapi_pb";
import { APP_THEME } from "../models/Theme";
import stationState from "../store/atoms/station";
import dropEitherJunctionStation from "../utils/dropJunctionStation";
import getIsPass from "../utils/isPass";
import { useCurrentStation } from "./useCurrentStation";
import { useLoopLine } from "./useLoopLine";
import { useThemeStore } from "./useThemeStore";

export const useNextStation = (
	ignorePass = true,
	originStation?: Station,
): Station | undefined => {
	const { stations: stationsFromState, selectedDirection } =
		useRecoilValue(stationState);
	const theme = useThemeStore();
	const currentStation = useCurrentStation(
		theme === APP_THEME.JR_WEST || theme === APP_THEME.LED,
	);
	const { isLoopLine } = useLoopLine();

	const station = useMemo(
		() => originStation ?? currentStation,
		[originStation, currentStation],
	);

	const stations = useMemo(
		() => dropEitherJunctionStation(stationsFromState, selectedDirection),
		[selectedDirection, stationsFromState],
	);

	const actualNextStation = useMemo(() => {
		if (isLoopLine) {
			const loopLineStationIndex =
				selectedDirection === "INBOUND"
					? stations.findIndex((s) => s?.groupId === station?.groupId) - 1
					: stations.findIndex((s) => s?.groupId === station?.groupId) + 1;

			if (!stations[loopLineStationIndex]) {
				return stations[
					selectedDirection === "INBOUND" ? stations.length - 1 : 0
				];
			}

			return stations[loopLineStationIndex];
		}

		const notLoopLineStationIndex =
			selectedDirection === "INBOUND"
				? stations.findIndex((s) => s?.groupId === station?.groupId) + 1
				: stations.findIndex((s) => s?.groupId === station?.groupId) - 1;

		return stations[notLoopLineStationIndex];
	}, [isLoopLine, selectedDirection, station?.groupId, stations]);

	const nextInboundStopStation = useMemo(() => {
		const inboundCurrentStationIndex = stations.findIndex(
			(s) => s?.groupId === station?.groupId,
		);

		return actualNextStation && getIsPass(actualNextStation) && ignorePass
			? stations
					.slice(inboundCurrentStationIndex - stations.length + 1)
					.find((s) => !getIsPass(s))
			: actualNextStation;
	}, [actualNextStation, ignorePass, station?.groupId, stations]);

	const nextOutboundStopStation = useMemo(() => {
		const outboundCurrentStationIndex = stations
			.slice()
			.reverse()
			.findIndex((s) => s?.groupId === station?.groupId);

		return actualNextStation && getIsPass(actualNextStation) && ignorePass
			? stations
					.slice()
					.reverse()
					.slice(outboundCurrentStationIndex - stations.length + 1)
					.find((s) => !getIsPass(s))
			: actualNextStation;
	}, [actualNextStation, ignorePass, station, stations]);

	return (
		(selectedDirection === "INBOUND"
			? nextInboundStopStation
			: nextOutboundStopStation) ?? undefined
	);
};
