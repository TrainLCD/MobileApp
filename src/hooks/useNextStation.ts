import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import type { Station } from '~/gen/proto/stationapi_pb';
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

  const actualNextStation = useMemo(() => {
    if (isLoopLine) {
      const loopLineStationIndex =
        selectedDirection === 'INBOUND'
          ? stations.findIndex((s) => s?.id === station?.id) - 1
          : stations.findIndex((s) => s?.id === station?.id) + 1;

      if (!stations[loopLineStationIndex]) {
        return stations[
          selectedDirection === 'INBOUND' ? stations.length - 1 : 0
        ];
      }

      return stations[loopLineStationIndex];
    }

    const notLoopLineStationIndex =
      selectedDirection === 'INBOUND'
        ? stations.findIndex((s) => s?.id === station?.id) + 1
        : stations.findIndex((s) => s?.id === station?.id) - 1;

    return stations[notLoopLineStationIndex];
  }, [isLoopLine, selectedDirection, station?.id, stations]);

  const nextInboundStopStation = useMemo(() => {
    const inboundCurrentStationIndex = stations.findIndex(
      (s) => s?.id === station?.id
    );

    return actualNextStation && getIsPass(actualNextStation) && ignorePass
      ? stations
          .slice(inboundCurrentStationIndex - stations.length + 1)
          .find((s) => !getIsPass(s))
      : actualNextStation;
  }, [actualNextStation, ignorePass, station?.id, stations]);

  const nextOutboundStopStation = useMemo(() => {
    const outboundCurrentStationIndex = stations
      .slice()
      .reverse()
      .findIndex((s) => s?.id === station?.id);

    return actualNextStation && getIsPass(actualNextStation) && ignorePass
      ? stations
          .slice()
          .reverse()
          .slice(outboundCurrentStationIndex - stations.length + 1)
          .find((s) => !getIsPass(s))
      : actualNextStation;
  }, [actualNextStation, ignorePass, station, stations]);

  return (
    (selectedDirection === 'INBOUND'
      ? nextInboundStopStation
      : nextOutboundStopStation) ?? undefined
  );
};
