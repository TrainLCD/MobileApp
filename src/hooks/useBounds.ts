import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import {
  MEIJO_LINE_MAJOR_STATIONS_ID,
  OSAKA_LOOP_LINE_MAJOR_STATIONS_ID,
  YAMANOTE_LINE_MAJOR_STATIONS_ID,
} from '~/constants/station';
import type { Station } from '~/gen/proto/stationapi_pb';
import {
  MEIJO_LINE_ID,
  OSASA_LOOP_LINE_ID,
  TOEI_OEDO_LINE_ID,
  YAMANOTE_LINE_ID,
} from '../constants';
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

export const useBounds = (
  overrideStations?: Station[]
): {
  bounds: [Station[], Station[]];
  directionalStops: Station[];
} => {
  const {
    stations: stationsFromAtom,
    selectedDirection,
    selectedBound,
  } = useAtomValue(stationState);
  const { trainType } = useAtomValue(navigationState);
  const currentStation = useCurrentStation();
  const currentLine = useCurrentLine();

  const {
    isLoopLine,
    inboundStationsForLoopLine,
    outboundStationsForLoopLine,
  } = useLoopLine();

  const stationsForCalc = overrideStations ?? stationsFromAtom;

  const majorStationIds = useMemo(() => {
    if (!currentLine) return [] as number[];
    if (currentLine.id === YAMANOTE_LINE_ID)
      return YAMANOTE_LINE_MAJOR_STATIONS_ID;
    if (currentLine.id === OSASA_LOOP_LINE_ID)
      return OSAKA_LOOP_LINE_MAJOR_STATIONS_ID;
    if (currentLine.id === MEIJO_LINE_ID) return MEIJO_LINE_MAJOR_STATIONS_ID;
    return [] as number[];
  }, [currentLine]);

  const bounds = useMemo((): [Station[], Station[]] => {
    const inboundStation = stationsForCalc[stationsForCalc.length - 1];
    const outboundStation = stationsForCalc[0];

    if (TOEI_OEDO_LINE_ID === currentLine?.id) {
      const stationIndex = stationsForCalc.findIndex(
        (s) => s.groupId === currentStation?.groupId
      );
      const oedoLineInboundStops = stationsForCalc
        .slice(stationIndex, stationsForCalc.length)
        .filter(
          (s) =>
            s.groupId !== currentStation?.groupId &&
            TOEI_OEDO_LINE_MAJOR_STATIONS_ID.includes(s.id)
        );
      const oedoLineOutboundStops = stationsForCalc
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
        // 引数がある場合は Jotai の値ではなく引数の stations を優先して算出
        if (overrideStations && currentStation) {
          const reversed = stationsForCalc.slice().reverse();
          const currentIndexInReversed = reversed.findIndex(
            (s) => s.id === currentStation.id
          );
          const inboundMajor = [
            ...reversed.slice(currentIndexInReversed),
            ...reversed.slice(0, currentIndexInReversed),
          ]
            .filter((s) => majorStationIds.includes(s.id))
            .filter((s) => s.id !== currentStation.id)
            .filter((s, i, a) => a.findIndex((e) => e.id === s.id) === i)
            .slice(0, 2);

          const currentIndex = stationsForCalc.findIndex(
            (s) => s.id === currentStation.id
          );
          const outboundMajor = [
            ...stationsForCalc.slice(currentIndex),
            ...stationsForCalc.slice(0, currentIndex),
          ]
            .filter((s) => majorStationIds.includes(s.id))
            .filter((s) => s.id !== currentStation.id)
            .filter((s, i, a) => a.findIndex((e) => e.id === s.id) === i)
            .slice(0, 2);

          return [inboundMajor, outboundMajor];
        }

        return [inboundStationsForLoopLine, outboundStationsForLoopLine];
      }
    }

    return [[inboundStation], [outboundStation]];
  }, [
    currentLine?.id,
    currentStation,
    inboundStationsForLoopLine,
    isLoopLine,
    majorStationIds,
    overrideStations,
    outboundStationsForLoopLine,
    stationsForCalc,
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
