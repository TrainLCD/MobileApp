import { useMutation } from "@connectrpc/connect-query";
import firestore from "@react-native-firebase/firestore";
import { useQuery } from "@tanstack/react-query";
import { getStationByIdList } from "../../gen/proto/stationapi-StationAPI_connectquery";
import type { SavedRoute } from "../models/SavedRoute";
import useCachedInitAnonymousUser from "./useCachedAnonymousUser";

export const useSavedRoutes = () => {
	useCachedInitAnonymousUser();

	const {
		data: routes,
		isLoading: isRoutesLoading,
		error: fetchRoutesError,
	} = useQuery<SavedRoute[]>({
		queryKey: ["/firestore/uploadedCommunityRoutes"],
		queryFn: async () => {
			const routesSnapshot = await firestore()
				.collection("uploadedCommunityRoutes")
				.orderBy("createdAt", "desc")
				.get();

			return routesSnapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
			})) as SavedRoute[];
		},
	});

	const {
		status: isStationsLoading,
		error: fetchStationsError,
		mutateAsync: fetchStationsByRoute,
	} = useMutation(getStationByIdList);

	return {
		routes,
		loading: isRoutesLoading || isStationsLoading === "pending",
		error: fetchRoutesError || fetchStationsError,
		fetchStationsByRoute,
	};
};
