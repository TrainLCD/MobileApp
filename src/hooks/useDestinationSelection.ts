import { useQueryClient } from "@tanstack/react-query";
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useMemo, useRef, useState } from "react";
import type { Line, Station, TrainType } from "~/@types/graphql";
import { graphqlQueryKey } from "~/lib/gql";
import {
	GET_CONNECTED_ROUTES,
	GET_LINE_GROUP_STATIONS,
	GET_LINE_STATIONS,
	GET_ROUTE_TYPES_LIGHT,
} from "~/lib/graphql/queries";
import lineState, { pendingLineAtom } from "~/store/atoms/line";
import navigationState from "~/store/atoms/navigation";
import stationState, {
	stationAtom,
	wantedDestinationAtom,
} from "~/store/atoms/station";
import {
	buildConnectedRouteTrainType,
	computeCurrentStationInRoutes,
	type ConnectedRoute,
	getStationWithMatchingLine,
} from "~/utils/routeSearch";
import { findLocalType } from "~/utils/trainTypeString";
import { useLazyGraphQLQuery } from "./useLazyGraphQLQuery";

type GetRouteTypesData = {
	routeTypes: {
		nextPageToken: string | null;
		trainTypes: TrainType[];
	};
};

type GetRouteTypesVariables = {
	fromStationGroupId: number;
	toStationGroupId: number;
	pageSize?: number;
	pageToken?: string;
	viaLineId?: number;
};

type GetConnectedRoutesData = {
	connectedRoutes: ConnectedRoute[];
};

type GetConnectedRoutesVariables = {
	fromStationGroupId: number;
	toStationGroupId: number;
};

type GetLineStationsData = {
	lineStations: Station[];
};

type GetLineStationsVariables = {
	lineId: number;
	stationId?: number;
};

type GetLineGroupStationsData = {
	lineGroupStations: Station[];
};

type GetLineGroupStationsVariables = {
	lineGroupId: number;
};

// GET_ROUTE_TYPES_LIGHT の pageSize。RouteSearchScreen の検索結果上限と同値。
const ROUTE_TYPES_PAGE_SIZE = 100;

export type UseDestinationSelectionResult = {
	/** 行き先駅カードのタップハンドラ(SelectBoundModal を開いて pendingStations を構築する) */
	handleDestinationSelected: (selectedStation: Station) => Promise<void>;
	/** TrainTypeListModal / SelectBoundModal からの種別選択ハンドラ */
	handleTrainTypeSelected: (trainType: TrainType) => Promise<void>;
	selectBoundModalVisible: boolean;
	trainTypeListModalVisible: boolean;
	selectedDestination: Station | null;
	wantedDestination: Station | null;
	/** TrainTypeListModal に渡す現在駅の路線 */
	trainTypeModalLine: Line | null;
	/** 種別取得中フラグ(カードのサブタイトルスケルトン・空状態のローディングに使う) */
	fetchRouteTypesLoading: boolean;
	/** SelectBoundModal / TrainTypeListModal に渡すローディング集約 */
	modalLoading: boolean;
	/** SelectBoundModal に渡すエラー集約 */
	modalError: Error | null;
	handleCloseSelectBoundModal: () => void;
	handleSelectBoundModalCloseAnimationEnd: () => void;
	handleBoundSelected: () => void;
	handleCloseTrainTypeListModal: () => void;
};

// RouteSearchScreen の検索結果タップと DestinationAgentScreen の提案カードタップで
// 共通に使う行き先決定ロジック。種別・方向・区間の整合性ロジックを複製しないため、
// 両画面はこのフック経由で同一の既存フロー(SelectBoundModal → selectedBound 確定)へ合流する。
export const useDestinationSelection = (): UseDestinationSelectionResult => {
	const [selectBoundModalVisible, setSelectBoundModalVisible] = useState(false);
	const [trainTypeListModalVisible, setTrainTypeListModalVisible] =
		useState(false);
	const [selectedDestination, setSelectedDestination] =
		useState<Station | null>(null);

	const station = useAtomValue(stationAtom);
	const wantedDestination = useAtomValue(wantedDestinationAtom);
	const pendingLine = useAtomValue(pendingLineAtom);
	const setStationState = useSetAtom(stationState);
	const setNavigationState = useSetAtom(navigationState);
	const setLineState = useSetAtom(lineState);

	const queryClient = useQueryClient();
	const connectedRouteStationsRef = useRef(new Map<number, Station[]>());

	const [
		fetchRouteTypes,
		{
			data: routeTypesData,
			loading: fetchRouteTypesLoading,
			error: fetchRouteTypesError,
		},
	] = useLazyGraphQLQuery<GetRouteTypesData, GetRouteTypesVariables>(
		GET_ROUTE_TYPES_LIGHT,
	);

	const [
		fetchConnectedRoutes,
		{ loading: fetchConnectedRoutesLoading, error: fetchConnectedRoutesError },
	] = useLazyGraphQLQuery<GetConnectedRoutesData, GetConnectedRoutesVariables>(
		GET_CONNECTED_ROUTES,
	);

	const [
		fetchStationsByLineId,
		{
			loading: fetchStationsByLineIdLoading,
			error: fetchStationsByLineIdError,
		},
	] = useLazyGraphQLQuery<GetLineStationsData, GetLineStationsVariables>(
		GET_LINE_STATIONS,
	);

	const [
		fetchStationsByLineGroupId,
		{
			loading: fetchStationsByLineGroupIdLoading,
			error: fetchStationsByLineGroupIdError,
		},
	] = useLazyGraphQLQuery<
		GetLineGroupStationsData,
		GetLineGroupStationsVariables
	>(GET_LINE_GROUP_STATIONS);

	const handleDestinationSelected = useCallback(
		async (selectedStation: Station) => {
			setSelectBoundModalVisible(true);
			setSelectedDestination(selectedStation);
			connectedRouteStationsRef.current.clear();

			const newPendingLine = selectedStation.line ?? null;

			setNavigationState((prev) => ({
				...prev,
				trainType: null,
				pendingTrainType: null,
			}));
			setStationState((prev) => ({
				...prev,
				pendingStations: [],
				wantedDestination: null,
			}));
			setLineState((prev) => ({
				...prev,
				pendingLine: newPendingLine,
			}));

			// Guard: ensure both lineId and stationId are present before calling the query
			if (
				!selectedStation.groupId ||
				!selectedStation.line?.id ||
				!station?.groupId
			) {
				return;
			}

			const result = await fetchRouteTypes({
				variables: {
					fromStationGroupId: station.groupId,
					toStationGroupId: selectedStation.groupId,
					pageSize: ROUTE_TYPES_PAGE_SIZE,
					viaLineId: selectedStation.line.id,
				},
			});

			const fetchedTrainTypes = result.data?.routeTypes.trainTypes ?? [];

			if (!fetchedTrainTypes.length) {
				const connectedRoutesResult = await fetchConnectedRoutes({
					variables: {
						fromStationGroupId: station.groupId,
						toStationGroupId: selectedStation.groupId,
					},
				});
				const connectedRoutes =
					connectedRoutesResult.data?.connectedRoutes ?? [];
				const connectedTrainTypes = connectedRoutes
					.map(buildConnectedRouteTrainType)
					.filter((trainType): trainType is TrainType => !!trainType);

				connectedRouteStationsRef.current = new Map(
					connectedRoutes.flatMap((route) =>
						route.id && route.stops
							? ([[route.id, route.stops]] as [number, Station[]][])
							: [],
					),
				);

				const connectedTrainType =
					findLocalType(connectedTrainTypes) ?? connectedTrainTypes[0];
				if (connectedTrainType?.groupId) {
					const connectedStations =
						connectedRouteStationsRef.current.get(connectedTrainType.groupId) ??
						[];
					const newCurrentStation = computeCurrentStationInRoutes(
						station,
						newPendingLine,
						[connectedTrainType],
					);

					setStationState((prev) => ({
						...prev,
						pendingStation: newCurrentStation,
						station:
							prev.station && newCurrentStation?.line
								? { ...prev.station, line: newCurrentStation.line }
								: prev.station,
						pendingStations: connectedStations,
					}));
					if (newCurrentStation?.line) {
						setLineState((prev) => ({
							...prev,
							pendingLine: newCurrentStation.line,
						}));
					}
					setNavigationState((prev) => ({
						...prev,
						fetchedTrainTypes: connectedTrainTypes,
						pendingTrainType: connectedTrainType,
					}));
					return;
				}

				if (!selectedStation.line?.id) {
					return;
				}
				// 単一種別・接続経路のどちらも存在しない場合は選択した行き先駅の路線を使用
				setLineState((prev) => ({
					...prev,
					pendingLine: selectedStation.line ?? null,
				}));
				// 現在の駅の路線情報を選択した路線に合わせて更新
				const updatedStation = getStationWithMatchingLine(
					station,
					selectedStation.line ?? null,
				);
				setStationState((prev) => ({
					...prev,
					pendingStation: updatedStation,
					station: updatedStation,
				}));
				const stationsByLineIdRes = await fetchStationsByLineId({
					variables: {
						lineId: selectedStation.line.id,
					},
				});
				const stations = stationsByLineIdRes.data?.lineStations ?? [];
				setStationState((prev) => ({
					...prev,
					pendingStations: stations,
				}));
				return;
			}

			// 先に選択される列車種別を決定
			const localTrainType =
				findLocalType(fetchedTrainTypes) ?? fetchedTrainTypes[0];

			if (!localTrainType?.groupId) {
				return;
			}

			// 選択された列車種別のみを使って路線を決定
			const newCurrentStation = computeCurrentStationInRoutes(
				station,
				newPendingLine,
				[localTrainType],
			);
			if (newCurrentStation) {
				setStationState((prev) => {
					const isSamePendingStation =
						prev.pendingStation?.groupId === newCurrentStation.groupId;
					const isSameStationLine =
						prev.station?.line?.id === newCurrentStation.line?.id;

					if (isSamePendingStation && isSameStationLine) {
						return prev;
					}
					return {
						...prev,
						pendingStation: isSamePendingStation
							? prev.pendingStation
							: newCurrentStation,
						// stationのlineも列車種別とマッチする路線に更新
						station: prev.station
							? { ...prev.station, line: newCurrentStation.line }
							: prev.station,
					};
				});
				// pendingLineを現在の駅にマッチする路線に更新
				if (newCurrentStation.line) {
					setLineState((prev) => ({
						...prev,
						pendingLine: newCurrentStation.line ?? null,
					}));
				}
			}

			const stationsByLineGroupIdRes = await fetchStationsByLineGroupId({
				variables: { lineGroupId: localTrainType.groupId },
			});
			const stations = stationsByLineGroupIdRes.data?.lineGroupStations ?? [];
			setStationState((prev) => ({
				...prev,
				pendingStations: stations,
			}));
			setNavigationState((prev) => ({
				...prev,
				fetchedTrainTypes,
				pendingTrainType: localTrainType,
			}));
		},
		[
			station,
			fetchStationsByLineId,
			fetchStationsByLineGroupId,
			fetchRouteTypes,
			fetchConnectedRoutes,
			setNavigationState,
			setStationState,
			setLineState,
		],
	);

	const handleTrainTypeSelected = useCallback(
		async (trainType: TrainType) => {
			if (!trainType.groupId) return;

			setSelectBoundModalVisible(true);

			setNavigationState((prev) => ({
				...prev,
				pendingTrainType: trainType,
			}));

			const connectedStations = connectedRouteStationsRef.current.get(
				trainType.groupId,
			);
			if (connectedStations) {
				const newCurrentStation = computeCurrentStationInRoutes(
					station,
					pendingLine,
					[trainType],
				);
				setStationState((prev) => ({
					...prev,
					pendingStation: newCurrentStation,
					station:
						prev.station && newCurrentStation?.line
							? { ...prev.station, line: newCurrentStation.line }
							: prev.station,
					pendingStations: connectedStations,
				}));
				if (newCurrentStation?.line) {
					setLineState((prev) => ({
						...prev,
						pendingLine: newCurrentStation.line,
					}));
				}
				return;
			}

			// キャッシュ済みでも常に最新の駅一覧を取得したいので該当キーを破棄する
			queryClient.removeQueries({
				queryKey: graphqlQueryKey(GET_LINE_GROUP_STATIONS, {
					lineGroupId: trainType.groupId,
				}),
			});

			const pendingStationsData = await fetchStationsByLineGroupId({
				variables: {
					lineGroupId: trainType.groupId,
				},
			});
			const pendingStations = pendingStationsData.data?.lineGroupStations ?? [];
			setStationState((prev) => ({
				...prev,
				pendingStations,
			}));
		},
		[
			fetchStationsByLineGroupId,
			station,
			pendingLine,
			setStationState,
			setNavigationState,
			setLineState,
			queryClient,
		],
	);

	const currentStationInRoutes = useMemo<Station | null>(
		() =>
			computeCurrentStationInRoutes(
				station,
				pendingLine,
				routeTypesData?.routeTypes?.trainTypes ?? [],
			),
		[station, pendingLine, routeTypesData?.routeTypes],
	);

	const trainTypeModalLine = useMemo(() => {
		const currentLine = currentStationInRoutes?.line;
		const currentStationLines = station?.lines ?? [];

		if (
			currentLine &&
			currentStationLines.some(
				(stationLine) => stationLine.id === currentLine.id,
			)
		) {
			return currentLine;
		}

		return station?.line ?? currentStationLines[0] ?? null;
	}, [currentStationInRoutes?.line, station?.line, station?.lines]);

	const handleCloseSelectBoundModal = useCallback(() => {
		setSelectBoundModalVisible(false);
	}, []);

	const handleSelectBoundModalCloseAnimationEnd = useCallback(() => {
		setSelectedDestination(null);
	}, []);

	const handleBoundSelected = useCallback(() => {
		setSelectBoundModalVisible(false);
		setTrainTypeListModalVisible(false);
	}, []);

	const handleCloseTrainTypeListModal = useCallback(() => {
		setTrainTypeListModalVisible(false);
	}, []);

	const modalLoading =
		fetchRouteTypesLoading ||
		fetchConnectedRoutesLoading ||
		fetchStationsByLineIdLoading ||
		fetchStationsByLineGroupIdLoading;

	const modalError =
		fetchRouteTypesError ??
		fetchConnectedRoutesError ??
		fetchStationsByLineIdError ??
		fetchStationsByLineGroupIdError ??
		null;

	return {
		handleDestinationSelected,
		handleTrainTypeSelected,
		selectBoundModalVisible,
		trainTypeListModalVisible,
		selectedDestination,
		wantedDestination,
		trainTypeModalLine,
		fetchRouteTypesLoading,
		modalLoading,
		modalError,
		handleCloseSelectBoundModal,
		handleSelectBoundModalCloseAnimationEnd,
		handleBoundSelected,
		handleCloseTrainTypeListModal,
	};
};
