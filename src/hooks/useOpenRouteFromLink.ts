import { useMutation } from '@connectrpc/connect-query';
import { useCallback } from 'react';
import { useSetRecoilState } from 'recoil';
import {
  getStationsByLineGroupId,
  getStationsByLineId,
} from '~/gen/proto/stationapi-StationAPI_connectquery';
import {
  GetStationByLineIdRequest,
  GetStationsByLineGroupIdRequest,
  type Station,
} from '~/gen/proto/stationapi_pb';
import type { LineDirection } from '../models/Bound';
import lineState from '../store/atoms/line';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';

export const useOpenRouteFromLink = () => {
  const setStationState = useSetRecoilState(stationState);
  const setNavigationState = useSetRecoilState(navigationState);
  const setLineState = useSetRecoilState(lineState);

  const {
    mutateAsync: fetchStationsByLineGroupId,
    status: fetchStationsByLineGroupIdStatus,
    error: fetchStationsByLineGroupIdError,
  } = useMutation(getStationsByLineGroupId);
  const {
    mutateAsync: fetchStationsByLineId,
    status: fetchStationsByLineIdStatus,
    error: fetchStationsByLineIdError,
  } = useMutation(getStationsByLineId);

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
        trainType: station.trainType ?? null,
        leftStations: [],
        stationForHeader: station,
      }));
      setStationState((prev) => ({
        ...prev,
        station,
        stations,
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
        const { stations } = await fetchStationsByLineGroupId(
          new GetStationsByLineGroupIdRequest({ lineGroupId })
        );

        const station = stations.find((sta) => sta.groupId === stationGroupId);
        if (!station) {
          return;
        }

        handleStationsFetched(station, stations, lineDirection);
        return;
      }

      if (lineId) {
        const { stations } = await fetchStationsByLineId(
          new GetStationByLineIdRequest({
            lineId,
          })
        );

        const station = stations.find((sta) => sta.groupId === stationGroupId);
        if (!station) {
          return;
        }

        handleStationsFetched(station, stations, lineDirection);
      }
    },
    [fetchStationsByLineGroupId, fetchStationsByLineId, handleStationsFetched]
  );

  return {
    openLink,
    isLoading:
      fetchStationsByLineGroupIdStatus === 'pending' ||
      fetchStationsByLineIdStatus === 'pending',
    error: fetchStationsByLineGroupIdError || fetchStationsByLineIdError,
  };
};
