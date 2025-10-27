import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import type { Station } from '~/@types/graphql';
import dropEitherJunctionStation from '~/utils/dropJunctionStation';
import stationState from '../store/atoms/station';
import getIsPass from '../utils/isPass';
import { useCurrentStation } from './useCurrentStation';
import { useLoopLine } from './useLoopLine';

export const useNextStation = (
  ignorePass = true,
  originStation?: Station
): Station | undefined => {
  const { stations: stationsFromState, selectedDirection } =
    useAtomValue(stationState);
  const currentStation = useCurrentStation();
  const { isLoopLine } = useLoopLine();

  const station = useMemo(
    () => originStation ?? currentStation,
    [originStation, currentStation]
  );

  const stations = useMemo(
    () => dropEitherJunctionStation(stationsFromState, selectedDirection),
    [selectedDirection, stationsFromState]
  );

  const stationIndex = useMemo(() => {
    const index = stations.findIndex((s) => s.id === station?.id);
    if (index !== -1) {
      return index;
    }

    return stations.findIndex((s) => s.groupId === station?.groupId);
  }, [station?.id, station?.groupId, stations]);

  const outboundStationIndex = useMemo(() => {
    const index = stations
      .slice()
      .reverse()
      .findIndex((s) => s.id === station?.id);

    if (index !== -1) {
      return index;
    }

    return stations
      .slice()
      .reverse()
      .findIndex((s) => s.groupId === station?.groupId);
  }, [station?.id, station?.groupId, stations]);

  const actualNextStation = useMemo(() => {
    if (stationIndex === -1) {
      return;
    }

    if (isLoopLine) {
      const loopLineStationIndex =
        selectedDirection === 'INBOUND' ? stationIndex - 1 : stationIndex + 1;

      if (!stations[loopLineStationIndex]) {
        return stations[
          selectedDirection === 'INBOUND' ? stations.length - 1 : 0
        ];
      }

      return stations[loopLineStationIndex];
    }

    const notLoopLineStationIndex =
      selectedDirection === 'INBOUND' ? stationIndex + 1 : stationIndex - 1;

    return stations[notLoopLineStationIndex];
  }, [isLoopLine, selectedDirection, stationIndex, stations]);

  const nextInboundStopStation = useMemo(() => {
    if (stationIndex === -1) {
      return;
    }

    return actualNextStation && getIsPass(actualNextStation) && ignorePass
      ? stations
          .slice(stationIndex - stations.length + 1)
          .find((s) => !getIsPass(s))
      : actualNextStation;
  }, [actualNextStation, ignorePass, stationIndex, stations]);

  const nextOutboundStopStation = useMemo(() => {
    if (outboundStationIndex === -1) {
      return;
    }

    return actualNextStation && getIsPass(actualNextStation) && ignorePass
      ? stations
          .slice()
          .reverse()
          .slice(outboundStationIndex - stations.length + 1)
          .find((s) => !getIsPass(s))
      : actualNextStation;
  }, [actualNextStation, ignorePass, outboundStationIndex, stations]);

  return selectedDirection === 'INBOUND'
    ? nextInboundStopStation
    : nextOutboundStopStation;
};
