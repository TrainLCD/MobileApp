import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import type { Station } from '~/gen/proto/stationapi_pb';
import { APP_THEME } from '../models/Theme';
import stationState from '../store/atoms/station';
import getIsPass from '../utils/isPass';
import { useCurrentStation } from './useCurrentStation';
import { useLoopLine } from './useLoopLine';
import { useThemeStore } from './useThemeStore';

export const useNextStation = (
  ignorePass = true,
  originStation?: Station
): Station | undefined => {
  const { stations, selectedDirection } = useAtomValue(stationState);
  const theme = useThemeStore();
  const currentStation = useCurrentStation(
    theme === APP_THEME.JR_WEST || theme === APP_THEME.LED
  );
  const { isLoopLine } = useLoopLine();

  const station = useMemo(
    () => originStation ?? currentStation,
    [originStation, currentStation]
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
