import type { ErrorLike } from '@apollo/client/core';
import { useLazyQuery } from '@apollo/client/react';
import findNearest from 'geolib/es/findNearest';
import orderByDistance from 'geolib/es/orderByDistance';
import { useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useState } from 'react';
import type { Line, Station, TrainType } from '~/@types/graphql';
import {
  GET_LINE_GROUP_STATIONS,
  GET_LINE_STATIONS,
  GET_STATION_TRAIN_TYPES_LIGHT,
} from '~/lib/graphql/queries';
import type { SavedRoute } from '~/models/SavedRoute';
import lineStateAtom from '../store/atoms/line';
import { locationAtom } from '../store/atoms/location';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';

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
  fetchTrainTypesError: ErrorLike | undefined;
  fetchStationsByLineIdError: ErrorLike | undefined;
  fetchStationsByLineGroupIdError: ErrorLike | undefined;
};

export const useLineSelection = (): UseLineSelectionResult => {
  const [isSelectBoundModalOpen, setIsSelectBoundModalOpen] = useState(false);
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
  ] = useLazyQuery<GetLineStationsData, GetLineStationsVariables>(
    GET_LINE_STATIONS
  );
  const [
    fetchStationsByLineGroupId,
    {
      loading: fetchStationsByLineGroupIdLoading,
      error: fetchStationsByLineGroupIdError,
    },
  ] = useLazyQuery<GetLineGroupStationsData, GetLineGroupStationsVariables>(
    GET_LINE_GROUP_STATIONS
  );
  const [
    fetchTrainTypes,
    { loading: fetchTrainTypesLoading, error: fetchTrainTypesError },
  ] = useLazyQuery<GetStationTrainTypesData, GetStationTrainTypesVariables>(
    GET_STATION_TRAIN_TYPES_LIGHT
  );

  const handleLineSelected = useCallback(
    async (line: Line) => {
      const lineId = line.id;
      const lineStationId = line.station?.id;
      if (!lineId || !lineStationId) return;

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
        pendingLine: line ?? null,
      }));
      setNavigationState((prev) => ({
        ...prev,
        fetchedTrainTypes: [],
        trainType: null,
        pendingTrainType: null,
      }));

      const result = await fetchStationsByLineId({
        variables: { lineId, stationId: lineStationId },
      });
      const fetchedStations = result.data?.lineStations ?? [];

      const pendingStation =
        fetchedStations.find((s) => s.id === lineStationId) ?? null;

      setStationState((prev) => ({
        ...prev,
        pendingStation,
        pendingStations: fetchedStations,
      }));

      if (line.station?.hasTrainTypes) {
        const result = await fetchTrainTypes({
          variables: {
            stationId: lineStationId,
          },
        });
        const fetchedTrainTypes = result.data?.stationTrainTypes ?? [];
        const designatedTrainTypeId =
          fetchedStations.find((s) => s.id === lineStationId)?.trainType?.id ??
          null;
        const designatedTrainType =
          fetchedTrainTypes.find((tt) => tt.id === designatedTrainTypeId) ??
          null;
        setNavigationState((prev) => ({
          ...prev,
          fetchedTrainTypes,
          pendingTrainType: designatedTrainType as TrainType | null,
        }));
      }
    },
    [
      fetchTrainTypes,
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
    async (lineId: number) => {
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

      setStationState((prev) => ({
        ...prev,
        selectedDirection: null,
        pendingStation: station,
        pendingStations: stations,
        wantedDestination: null,
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
    async (lineGroupId: number) => {
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

      setStationState((prev) => ({
        ...prev,
        selectedDirection: null,
        pendingStation: station,
        pendingStations: stations,
        wantedDestination: null,
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
        await openModalByTrainTypeId(route.trainTypeId);
      } else {
        await openModalByLineId(route.lineId);
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
