import findNearest from 'geolib/es/findNearest';
import orderByDistance from 'geolib/es/orderByDistance';
import { useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useRef, useState } from 'react';
import type { Line, Station, TrainType } from '~/@types/graphql';
import {
  GET_LINE_GROUP_STATIONS,
  GET_LINE_STATIONS,
  GET_STATION_TRAIN_TYPES_LIGHT,
} from '~/lib/graphql/queries';
import type { SavedRoute } from '~/models/SavedRoute';
import { isBusLine } from '~/utils/line';
import lineStateAtom from '../store/atoms/line';
import { locationAtom } from '../store/atoms/location';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { useLazyGraphQLQuery } from './useLazyGraphQLQuery';

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

type GetStationTrainTypesData = {
  stationTrainTypes: TrainType[];
};

type GetStationTrainTypesVariables = {
  stationId: number;
};

export type UseLineSelectionResult = {
  handleLineSelected: (line: Line) => Promise<void>;
  handleTrainTypeSelect: (trainType: TrainType) => Promise<void>;
  handlePresetPress: (route: SavedRoute) => Promise<void>;
  handleCloseSelectBoundModal: () => void;
  isSelectBoundModalOpen: boolean;
  fetchTrainTypesLoading: boolean;
  fetchStationsByLineIdLoading: boolean;
  fetchStationsByLineGroupIdLoading: boolean;
  fetchTrainTypesError: Error | undefined;
  fetchStationsByLineIdError: Error | undefined;
  fetchStationsByLineGroupIdError: Error | undefined;
};

export const useLineSelection = (): UseLineSelectionResult => {
  const [isSelectBoundModalOpen, setIsSelectBoundModalOpen] = useState(false);
  // 路線を選び直した際に、前の選択の取得結果が新しい状態を上書きしないよう世代を管理する
  const selectionGenerationRef = useRef(0);
  const setStationState = useSetAtom(stationState);
  const setLineState = useSetAtom(lineStateAtom);
  const setNavigationState = useSetAtom(navigationState);
  const location = useAtomValue(locationAtom);
  const latitude = location?.coords.latitude;
  const longitude = location?.coords.longitude;

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
  const [
    fetchTrainTypes,
    { loading: fetchTrainTypesLoading, error: fetchTrainTypesError },
  ] = useLazyGraphQLQuery<
    GetStationTrainTypesData,
    GetStationTrainTypesVariables
  >(GET_STATION_TRAIN_TYPES_LIGHT);

  const handleLineSelected = useCallback(
    async (line: Line) => {
      const lineId = line.id;
      const lineStationId = line.station?.id;
      if (!lineId || !lineStationId) return;

      const generation = ++selectionGenerationRef.current;

      setIsSelectBoundModalOpen(true);

      setStationState((prev) => ({
        ...prev,
        pendingStation: null,
        pendingStations: [],
        selectedDirection: null,
        wantedDestination: null,
        selectedBound: null,
      }));
      setLineState((prev) => ({
        ...prev,
        selectedLine: null,
        pendingLine: line ?? null,
      }));
      setNavigationState((prev) => ({
        ...prev,
        fetchedTrainTypes: [],
        trainType: null,
        pendingTrainType: null,
      }));

      // 駅一覧と種別一覧は互いに独立したクエリなので並列で取得する
      const [{ data }, fetchedTrainTypesData] = await Promise.all([
        fetchStationsByLineId({
          variables: { lineId, stationId: lineStationId },
        }),
        line.station?.hasTrainTypes
          ? fetchTrainTypes({
              variables: {
                stationId: lineStationId,
              },
            })
          : null,
      ]);
      // 取得中に別の路線が選ばれていたら、この呼び出しの結果は破棄する
      if (generation !== selectionGenerationRef.current) return;

      const fetchedStations = data?.lineStations ?? [];

      const pendingStation =
        fetchedStations.find((s) => s.id === lineStationId) ?? null;

      setStationState((prev) => ({
        ...prev,
        pendingStation,
        pendingStations: fetchedStations,
      }));

      if (fetchedTrainTypesData) {
        const fetchedTrainTypes =
          fetchedTrainTypesData.data?.stationTrainTypes ?? [];
        const designatedTrainTypeId =
          fetchedStations.find((s) => s.id === lineStationId)?.trainType?.id ??
          null;
        const designatedTrainType =
          fetchedTrainTypes.find((tt) => tt.id === designatedTrainTypeId) ??
          null;
        // バスは station.trainType を持たないため、最初の列車種別を自動選択する
        const fallbackTrainType =
          !designatedTrainType && isBusLine(line)
            ? (fetchedTrainTypes[0] ?? null)
            : null;
        const initialTrainType = designatedTrainType ?? fallbackTrainType;

        setNavigationState((prev) => ({
          ...prev,
          fetchedTrainTypes,
          pendingTrainType: initialTrainType as TrainType | null,
        }));

        // 種別を自動選択したら駅一覧もその系統(直通を含む)へ揃える。
        // 路線単独の駅一覧のまま種別だけ設定すると、プリセット復元時に使う
        // lineGroupStations と並び・範囲が食い違い、始発駅・終着駅がずれる
        if (initialTrainType?.groupId != null) {
          const groupResult = await fetchStationsByLineGroupId({
            variables: { lineGroupId: initialTrainType.groupId },
          });
          if (generation !== selectionGenerationRef.current) return;

          const lineGroupStations = groupResult.data?.lineGroupStations ?? [];
          // 取得できなかった場合は路線単独の駅一覧を残す（空で潰さない）
          if (lineGroupStations.length) {
            setStationState((prev) => ({
              ...prev,
              pendingStations: lineGroupStations,
              // 直通系統では同じ駅でも駅IDが変わりうるため groupId でも引き当てる
              pendingStation:
                lineGroupStations.find((s) => s.id === lineStationId) ??
                lineGroupStations.find(
                  (s) => s.groupId === pendingStation?.groupId
                ) ??
                prev.pendingStation,
            }));
          }
        }
      }
    },
    [
      fetchTrainTypes,
      fetchStationsByLineGroupId,
      setNavigationState,
      setStationState,
      setLineState,
      fetchStationsByLineId,
    ]
  );

  const handleTrainTypeSelect = useCallback(
    async (trainType: TrainType) => {
      if (trainType.groupId == null) return;
      const res = await fetchStationsByLineGroupId({
        variables: {
          lineGroupId: trainType.groupId,
        },
      });
      setStationState((prev) => ({
        ...prev,
        pendingStations: res.data?.lineGroupStations ?? [],
      }));
      setNavigationState((prev) => ({
        ...prev,
        pendingTrainType: trainType,
      }));
    },
    [fetchStationsByLineGroupId, setStationState, setNavigationState]
  );

  const openModalByLineId = useCallback(
    async (lineId: number, wantedDestinationId?: number | null) => {
      const result = await fetchStationsByLineId({
        variables: { lineId },
      });
      const stations = result.data?.lineStations ?? [];
      if (!stations.length) return;

      const nearestCoordinates =
        latitude && longitude
          ? (findNearest(
              { latitude, longitude },
              stations.map((sta: Station) => ({
                latitude: sta.latitude as number,
                longitude: sta.longitude as number,
              }))
            ) as { latitude: number; longitude: number })
          : stations.map((s) => ({
              latitude: s.latitude,
              longitude: s.longitude,
            }))[0];

      const station = stations.find(
        (sta: Station) =>
          sta.latitude === nearestCoordinates.latitude &&
          sta.longitude === nearestCoordinates.longitude
      );

      if (!station) return;

      const wantedDestination =
        wantedDestinationId != null
          ? (stations.find((s) => s.groupId === wantedDestinationId) ?? null)
          : null;

      setStationState((prev) => ({
        ...prev,
        selectedDirection: null,
        pendingStation: station,
        pendingStations: stations,
        wantedDestination,
      }));
      setLineState((prev) => ({
        ...prev,
        pendingLine: (station.line as Line) ?? null,
      }));
      setNavigationState((prev) => ({
        ...prev,
        fetchedTrainTypes: [],
        pendingTrainType: null,
      }));
    },
    [
      fetchStationsByLineId,
      latitude,
      longitude,
      setStationState,
      setLineState,
      setNavigationState,
    ]
  );

  const openModalByTrainTypeId = useCallback(
    async (lineGroupId: number, wantedDestinationId?: number | null) => {
      const result = await fetchStationsByLineGroupId({
        variables: { lineGroupId },
      });
      const stations = result.data?.lineGroupStations ?? [];
      if (!stations.length) return;

      const sortedStationCoords =
        latitude && longitude
          ? (orderByDistance(
              { lat: latitude, lon: longitude },
              stations.map((sta) => ({
                latitude: sta.latitude as number,
                longitude: sta.longitude as number,
              }))
            ) as { latitude: number; longitude: number }[])
          : stations.map((sta) => ({
              latitude: sta.latitude,
              longitude: sta.longitude,
            }));

      const sortedStations = stations.slice().sort((a, b) => {
        const aIndex = sortedStationCoords.findIndex(
          (coord) =>
            coord.latitude === a.latitude && coord.longitude === a.longitude
        );
        const bIndex = sortedStationCoords.findIndex(
          (coord) =>
            coord.latitude === b.latitude && coord.longitude === b.longitude
        );
        return aIndex - bIndex;
      });

      const station = sortedStations.find(
        (sta: Station) => sta.trainType?.groupId === lineGroupId
      );

      if (!station) return;

      const wantedDestination =
        wantedDestinationId != null
          ? (stations.find((s) => s.groupId === wantedDestinationId) ?? null)
          : null;

      setStationState((prev) => ({
        ...prev,
        selectedDirection: null,
        pendingStation: station,
        pendingStations: stations,
        wantedDestination,
      }));
      setLineState((prev) => ({
        ...prev,
        pendingLine: station?.line ?? null,
      }));

      const fetchedTrainTypesData = await fetchTrainTypes({
        variables: {
          stationId: station.id as number,
        },
      });
      const trainTypes = fetchedTrainTypesData.data?.stationTrainTypes ?? [];

      setNavigationState((prev) => ({
        ...prev,
        pendingTrainType: station.trainType ?? null,
        fetchedTrainTypes: trainTypes,
      }));
    },
    [
      fetchStationsByLineGroupId,
      fetchTrainTypes,
      setNavigationState,
      setStationState,
      setLineState,
      latitude,
      longitude,
    ]
  );

  const handlePresetPress = useCallback(
    async (route: SavedRoute) => {
      setIsSelectBoundModalOpen(true);
      if (route.hasTrainType) {
        await openModalByTrainTypeId(
          route.trainTypeId,
          route.wantedDestinationId
        );
      } else {
        await openModalByLineId(route.lineId, route.wantedDestinationId);
      }
    },
    [openModalByLineId, openModalByTrainTypeId]
  );

  const handleCloseSelectBoundModal = useCallback(() => {
    setIsSelectBoundModalOpen(false);
  }, []);

  return {
    handleLineSelected,
    handleTrainTypeSelect,
    handlePresetPress,
    handleCloseSelectBoundModal,
    isSelectBoundModalOpen,
    fetchTrainTypesLoading,
    fetchStationsByLineIdLoading,
    fetchStationsByLineGroupIdLoading,
    fetchTrainTypesError,
    fetchStationsByLineIdError,
    fetchStationsByLineGroupIdError,
  };
};
