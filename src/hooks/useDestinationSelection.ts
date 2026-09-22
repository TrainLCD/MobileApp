import { useQueryClient } from '@tanstack/react-query';
import { useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useMemo, useState } from 'react';
import type { Line, Station, TrainType } from '~/@types/graphql';
import { graphqlQueryKey } from '~/lib/gql';
import {
  GET_CONNECTED_ROUTES,
  GET_LINE_GROUP_STATIONS,
  GET_LINE_STATIONS,
} from '~/lib/graphql/queries';
import { pendingJourneyAtom } from '~/store/atoms/journey';
import lineState, { pendingLineAtom } from '~/store/atoms/line';
import navigationState from '~/store/atoms/navigation';
import stationState, {
  stationAtom,
  wantedDestinationAtom,
} from '~/store/atoms/station';
import {
  buildJourney,
  type ConnectedRoute,
  computeCurrentStationInRoutes,
  filterRideableRoutes,
  getStationWithMatchingLine,
  pickDefaultTrainType,
} from '~/utils/routeSearch';
import { useLazyGraphQLQuery } from './useLazyGraphQLQuery';

type GetConnectedRoutesData = {
  connectedRoutes: ConnectedRoute[];
};

type GetConnectedRoutesVariables = {
  fromStationGroupId: number;
  toStationGroupId: number;
  viaLineId?: number;
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
  /** SelectBoundModal で方面を片方向に絞る基準駅(選択中の経路の最初の区間の降車駅) */
  boundDirectionStation: Station | null;
  /** 乗車に使える経路(API の順位順) */
  routes: ConnectedRoute[];
  /** 選択中の経路の添字(既定は先頭) */
  selectedRouteIndex: number;
  /** 経路一覧からの経路選択ハンドラ */
  handleRouteSelected: (index: number) => Promise<void>;
  /** 経路取得中フラグ(カードのサブタイトルスケルトン・空状態のローディングに使う) */
  fetchConnectedRoutesLoading: boolean;
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
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);

  const station = useAtomValue(stationAtom);
  const wantedDestination = useAtomValue(wantedDestinationAtom);
  const pendingLine = useAtomValue(pendingLineAtom);
  const setStationState = useSetAtom(stationState);
  const setPendingJourney = useSetAtom(pendingJourneyAtom);
  const setNavigationState = useSetAtom(navigationState);
  const setLineState = useSetAtom(lineState);

  const queryClient = useQueryClient();

  const [
    fetchConnectedRoutes,
    {
      data: connectedRoutesData,
      loading: fetchConnectedRoutesLoading,
      error: fetchConnectedRoutesError,
    },
  ] = useLazyGraphQLQuery<GetConnectedRoutesData, GetConnectedRoutesVariables>(
    GET_CONNECTED_ROUTES
  );

  const [
    fetchStationsByLineId,
    {
      loading: fetchStationsByLineIdLoading,
      error: fetchStationsByLineIdError,
    },
  ] = useLazyGraphQLQuery<GetLineStationsData, GetLineStationsVariables>(
    GET_LINE_STATIONS
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

  // 経路の最初の区間を種別選択・方面選択の対象にする。乗換のある経路は区間の並びを
  // pendingJourney に持たせ、方面を選んだ時点で SelectBoundModal が乗車中の経路へ移す
  const applyRoute = useCallback(
    async (route: ConnectedRoute | undefined, selectedStation: Station) => {
      const newPendingLine = selectedStation.line ?? null;
      const fetchedTrainTypes = route?.legs?.[0]?.trainTypes ?? [];

      setPendingJourney(buildJourney(route));

      if (!fetchedTrainTypes.length) {
        if (!selectedStation.line?.id) {
          return;
        }
        // 列車種別が存在しない場合は選択した行き先駅の路線を使用
        setLineState((prev) => ({
          ...prev,
          pendingLine: selectedStation.line ?? null,
        }));
        // 現在の駅の路線情報を選択した路線に合わせて更新
        const updatedStation = getStationWithMatchingLine(
          station,
          selectedStation.line ?? null
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
      const localTrainType = pickDefaultTrainType(fetchedTrainTypes);

      if (!localTrainType?.groupId) {
        return;
      }

      // 選択された列車種別のみを使って路線を決定
      const newCurrentStation = computeCurrentStationInRoutes(
        station,
        newPendingLine,
        [localTrainType]
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
      setNavigationState,
      setStationState,
      setLineState,
      setPendingJourney,
    ]
  );

  // 選択をやり直す前に、前の経路で組み立てた候補を捨てる
  const resetPendingSelection = useCallback(
    (newPendingLine: Line | null) => {
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
      setPendingJourney(null);
    },
    [setNavigationState, setStationState, setLineState, setPendingJourney]
  );

  const handleDestinationSelected = useCallback(
    async (selectedStation: Station) => {
      setSelectBoundModalVisible(true);
      setSelectedDestination(selectedStation);
      setSelectedRouteIndex(0);

      resetPendingSelection(selectedStation.line ?? null);

      // Guard: ensure both lineId and stationId are present before calling the query
      if (
        !selectedStation.groupId ||
        !selectedStation.line?.id ||
        !station?.groupId
      ) {
        return;
      }

      const result = await fetchConnectedRoutes({
        variables: {
          fromStationGroupId: station.groupId,
          toStationGroupId: selectedStation.groupId,
          viaLineId: selectedStation.line.id,
        },
      });

      const routes = filterRideableRoutes(result.data?.connectedRoutes ?? []);
      await applyRoute(routes[0], selectedStation);
    },
    [station, fetchConnectedRoutes, resetPendingSelection, applyRoute]
  );

  const handleTrainTypeSelected = useCallback(
    async (trainType: TrainType) => {
      if (!trainType.groupId) return;

      setSelectBoundModalVisible(true);

      setNavigationState((prev) => ({
        ...prev,
        pendingTrainType: trainType,
      }));
      // 乗換のある経路では最初の区間で乗る種別として持つ
      setPendingJourney((prev) =>
        prev
          ? {
              ...prev,
              legs: prev.legs.map((leg, index) =>
                index === 0 ? { ...leg, trainType } : leg
              ),
            }
          : prev
      );

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
      setStationState,
      setNavigationState,
      setPendingJourney,
      queryClient,
    ]
  );

  const routes = useMemo(
    () => filterRideableRoutes(connectedRoutesData?.connectedRoutes ?? []),
    [connectedRoutesData?.connectedRoutes]
  );

  const selectedRoute = routes[selectedRouteIndex];

  const handleRouteSelected = useCallback(
    async (index: number) => {
      const route = routes[index];
      if (!route || !selectedDestination) return;

      setSelectBoundModalVisible(true);
      setSelectedRouteIndex(index);
      resetPendingSelection(selectedDestination.line ?? null);
      await applyRoute(route, selectedDestination);
    },
    [routes, selectedDestination, resetPendingSelection, applyRoute]
  );

  const currentStationInRoutes = useMemo<Station | null>(
    () =>
      computeCurrentStationInRoutes(
        station,
        pendingLine,
        selectedRoute?.legs?.[0]?.trainTypes ?? []
      ),
    [station, pendingLine, selectedRoute]
  );

  // 乗換経路では行き先が最初の区間の駅リストに含まれないため、
  // 行き先の代わりに最初の区間の降車駅(乗換駅)へ向かう方面に絞る
  const boundDirectionStation = selectedRoute?.legs?.[0]?.toStation ?? null;

  const trainTypeModalLine = useMemo(() => {
    const currentLine = currentStationInRoutes?.line;
    const currentStationLines = station?.lines ?? [];

    if (
      currentLine &&
      currentStationLines.some(
        (stationLine) => stationLine.id === currentLine.id
      )
    ) {
      return currentLine;
    }

    return station?.line ?? currentStationLines[0] ?? null;
  }, [currentStationInRoutes?.line, station?.line, station?.lines]);

  const handleCloseSelectBoundModal = useCallback(() => {
    setSelectBoundModalVisible(false);
    setPendingJourney(null);
  }, [setPendingJourney]);

  const handleSelectBoundModalCloseAnimationEnd = useCallback(() => {
    setSelectedDestination(null);
  }, []);

  // SelectBoundModal が pendingJourney を乗車中の経路へ移してから呼ばれる
  const handleBoundSelected = useCallback(() => {
    setSelectBoundModalVisible(false);
    setTrainTypeListModalVisible(false);
    setPendingJourney(null);
  }, [setPendingJourney]);

  const handleCloseTrainTypeListModal = useCallback(() => {
    setTrainTypeListModalVisible(false);
  }, []);

  const modalLoading =
    fetchConnectedRoutesLoading ||
    fetchStationsByLineIdLoading ||
    fetchStationsByLineGroupIdLoading;

  const modalError =
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
    boundDirectionStation,
    routes,
    selectedRouteIndex,
    handleRouteSelected,
    fetchConnectedRoutesLoading,
    modalLoading,
    modalError,
    handleCloseSelectBoundModal,
    handleSelectBoundModalCloseAnimationEnd,
    handleBoundSelected,
    handleCloseTrainTypeListModal,
  };
};
