import { useMemo } from "react";
import { useRecoilValue } from "recoil";
import type { TrainType } from "../../gen/proto/stationapi_pb";
import stationState from "../store/atoms/station";
import { useCurrentStation } from "./useCurrentStation";
import useCurrentTrainType from "./useCurrentTrainType";
import useNextLine from "./useNextLine";

const useNextTrainType = (): TrainType | null => {
	const { stations, selectedDirection } = useRecoilValue(stationState);
	const nextLine = useNextLine();
	const currentStation = useCurrentStation();
	const trainType = useCurrentTrainType();

	// 同じ路線でも種別が変わる場合を想定(小田急線等)
	const sameLineNextType = useMemo(() => {
		if (selectedDirection === "INBOUND") {
			const currentIndex = stations.findIndex(
				(sta) => sta.id === currentStation?.id,
			);
			return stations
				.slice(currentIndex, stations.length)
				.map((sta) => sta.trainType)
				.filter((tt) => tt)
				.find((tt) => tt?.typeId !== trainType?.typeId);
		}

		const currentIndex = stations
			.slice()
			.reverse()
			.findIndex((sta) => sta.id === currentStation?.id);
		return stations
			.slice()
			.reverse()
			.slice(currentIndex, stations.length)
			.map((sta) => sta.trainType)
			.filter((tt) => tt)
			.find((tt) => tt?.typeId !== trainType?.typeId);
	}, [currentStation?.id, selectedDirection, stations, trainType?.typeId]);

	const nextLineTrainType = useMemo(
		() =>
			trainType?.lines?.find((l) => l.id === nextLine?.id)?.trainType ?? null,
		[nextLine?.id, trainType?.lines],
	);

	const nextTrainType = useMemo(() => {
		return sameLineNextType ?? nextLineTrainType;
	}, [nextLineTrainType, sameLineNextType]);

	return nextTrainType;
};

export default useNextTrainType;
