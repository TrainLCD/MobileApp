import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import type { Station } from '~/gen/proto/stationapi_pb';
import { TOEI_OEDO_LINE_ID } from '../constants';
import {
  TOEI_OEDO_LINE_MAJOR_STATIONS_ID,
  TOEI_OEDO_LINE_TOCHOMAE_STATION_ID_INNER,
  TOEI_OEDO_LINE_TOCHOMAE_STATION_ID_OUTER,
  TOEI_OEDO_LINE_TSUKIJISHIJO_STATION_ID,
} from '../constants/station';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { getIsLocal } from '../utils/trainTypeString';
import { useCurrentLine } from './useCurrentLine';
import { useCurrentStation } from './useCurrentStation';
import { useLoopLine } from './useLoopLine';

export const useBounds = (): {
  bounds: [Station[], Station[]];
  directionalStops: Station[];
} => {
  const { stations, selectedDirection, selectedBound } =
    useAtomValue(stationState);
  const { trainType } = useAtomValue(navigationState);
  const currentStation = useCurrentStation();
  const currentLine = useCurrentLine();

  const {
    isLoopLine,
    inboundStationsForLoopLine,
    outboundStationsForLoopLine,
  } = useLoopLine();

  const bounds = useMemo((): [Station[], Station[]] => {
    const inboundStation = stations[stations.length - 1];
    const outboundStation = stations[0];

    if (TOEI_OEDO_LINE_ID === currentLine?.id) {
      const stationIndex = stations.findIndex(
        (s) => s.groupId === currentStation?.groupId
      );
      const oedoLineInboundStops = stations
        .slice(stationIndex, stations.length)
        .filter(
          (s) =>
            s.groupId !== currentStation?.groupId &&
            TOEI_OEDO_LINE_MAJOR_STATIONS_ID.includes(s.id)
        );
      const oedoLineOutboundStops = stations
        .slice(0, stationIndex)
        .reverse()
        .filter(
          (s) =>
            (s.groupId !== currentStation?.groupId &&
              TOEI_OEDO_LINE_MAJOR_STATIONS_ID.includes(s.id)) ||
            s.id === TOEI_OEDO_LINE_TOCHOMAE_STATION_ID_OUTER
        )
        // NOTE: 光が丘~築地市場駅間では「都庁前」案内をしない
        .filter((s) =>
          currentStation &&
          currentStation.id >= TOEI_OEDO_LINE_TSUKIJISHIJO_STATION_ID
            ? s.id !== TOEI_OEDO_LINE_TOCHOMAE_STATION_ID_INNER
            : true
        );

      return [oedoLineInboundStops, oedoLineOutboundStops];
    }

    if (!trainType || getIsLocal(trainType)) {
      if (isLoopLine) {
        return [inboundStationsForLoopLine, outboundStationsForLoopLine];
      }
    }

    return [[inboundStation], [outboundStation]];
  }, [
    currentLine?.id,
    currentStation,
    inboundStationsForLoopLine,
    isLoopLine,
    outboundStationsForLoopLine,
    stations,
    trainType,
  ]);

  const directionalStops = useMemo(() => {
    const slicedBounds = bounds[selectedDirection === 'INBOUND' ? 0 : 1]
      .filter((s) => !!s)
      .slice(0, 2);
    if (selectedBound && !slicedBounds.length) {
      return [selectedBound];
    }
    return slicedBounds;
  }, [bounds, selectedBound, selectedDirection]);

  return { bounds, directionalStops };
};
