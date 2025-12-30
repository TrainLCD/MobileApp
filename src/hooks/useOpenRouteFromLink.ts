import { useLazyQuery } from '@apollo/client/react';
import { useSetAtom } from 'jotai';
import { useCallback } from 'react';
import type { Station, TrainType } from '~/@types/graphql';
import {
  GET_LINE_GROUP_STATIONS,
  GET_LINE_STATIONS,
} from '~/lib/graphql/queries';
import type { LineDirection } from '../models/Bound';
import lineState from '../store/atoms/line';
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

export const useOpenRouteFromLink = () => {
  const setStationState = useSetAtom(stationState);
  const setNavigationState = useSetAtom(navigationState);
  const setLineState = useSetAtom(lineState);

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
    fetchStationsByLineId,
    {
      loading: fetchStationsByLineIdLoading,
      error: fetchStationsByLineIdError,
    },
  ] = useLazyQuery<GetLineStationsData, GetLineStationsVariables>(
    GET_LINE_STATIONS
  );

  const handleStationsFetched = useCallback(
    (
      station: Station,
      stations: Station[],
      direction: LineDirection | null
    ) => {
      const line = station?.line;
      if (!line) {
        return;
      }
      setLineState((prev) => ({ ...prev, selectedLine: line }));
      setNavigationState((prev) => ({
        ...prev,
        pendingTrainType: (station.trainType ?? null) as TrainType | null,
        leftStations: [],
        stationForHeader: station,
      }));
      setStationState((prev) => ({
        ...prev,
        pendingStation: station,
        pendingStations: stations,
        selectedDirection: direction,
        selectedBound:
          direction === 'INBOUND' ? stations[stations.length - 1] : stations[0],
      }));
    },
    [setLineState, setNavigationState, setStationState]
  );

  const openLink = useCallback(
    async ({
      stationGroupId,
      direction,
      lineGroupId,
      lineId,
    }: {
      stationGroupId: number;
      direction: 0 | 1;
      lineGroupId: number | undefined;
      lineId: number | undefined;
    }) => {
      const lineDirection: LineDirection =
        direction === 0 ? 'INBOUND' : 'OUTBOUND';

      if (lineGroupId) {
        const { data } = await fetchStationsByLineGroupId({
          variables: { lineGroupId },
        });

        const stations = data?.lineGroupStations ?? [];
        const station = stations.find((sta) => sta.groupId === stationGroupId);
        if (!station) {
          return;
        }

        handleStationsFetched(station, stations, lineDirection);
        return;
      }

      if (lineId) {
        const { data } = await fetchStationsByLineId({
          variables: { lineId },
        });

        const stations = data?.lineStations ?? [];
        const station = stations.find((sta) => sta.groupId === stationGroupId);
        if (!station) {
          return;
        }

        handleStationsFetched(station, stations, lineDirection);
      }
    },
    [handleStationsFetched, fetchStationsByLineGroupId, fetchStationsByLineId]
  );

  return {
    openLink,
    isLoading:
      fetchStationsByLineGroupIdLoading || fetchStationsByLineIdLoading,
    error: fetchStationsByLineGroupIdError || fetchStationsByLineIdError,
  };
};
