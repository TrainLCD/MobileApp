import { useMutation } from "@connectrpc/connect-query";
import { getStationsByLineGroupId } from "../../gen/proto/stationapi-StationAPI_connectquery";

export const useTrainTypeStations = () => {
	const { data, status, error, mutateAsync } = useMutation(
		getStationsByLineGroupId,
	);

	return {
		stations: data?.stations ?? [],
		isLoading: status === "pending",
		error,
		fetchStations: mutateAsync,
	};
};
