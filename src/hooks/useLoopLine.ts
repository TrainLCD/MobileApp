import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import type { Station } from '~/gen/proto/stationapi_pb';
import {
  MEIJO_LINE_ID,
  MEIJO_LINE_MAJOR_STATIONS_ID,
  OSAKA_LOOP_LINE_MAJOR_STATIONS_ID,
  OSASA_LOOP_LINE_ID,
  TOEI_OEDO_LINE_ID,
  YAMANOTE_LINE_ID,
  YAMANOTE_LINE_MAJOR_STATIONS_ID,
} from '../constants';
import stationState from '../store/atoms/station';
import { getIsLocal } from '../utils/trainTypeString';
import { useCurrentLine } from './useCurrentLine';
import { useCurrentStation } from './useCurrentStation';
import { useCurrentTrainType } from './useCurrentTrainType';

export const useLoopLine = (
  overrideStations?: Station[],
  checkCurrentLine = true
) => {
  const { stations: stationsFromAtom } = useAtomValue(stationState);

  const stations = useMemo(
    () => overrideStations ?? stationsFromAtom,
    [overrideStations, stationsFromAtom]
  );

  const station = useCurrentStation();
  const currentLine = useCurrentLine();

  const line = checkCurrentLine ? currentLine : null;

  const trainType = useCurrentTrainType();

  const isYamanoteLine = useMemo(
    (): boolean =>
      line
        ? line?.id === YAMANOTE_LINE_ID
        : stations.every((s) => s.line?.id === YAMANOTE_LINE_ID),
    [line, stations]
  );

  const isOsakaLoopLine = useMemo(
    (): boolean =>
      line
        ? line?.id === OSASA_LOOP_LINE_ID
        : stations.every((s) => s.line?.id === OSASA_LOOP_LINE_ID),
    [line, stations]
  );
  const isMeijoLine = useMemo(
    (): boolean =>
      line
        ? line?.id === MEIJO_LINE_ID
        : stations.every((s) => s.line?.id === MEIJO_LINE_ID),
    [line, stations]
  );
  const isOedoLine = useMemo(
    (): boolean =>
      line
        ? line?.id === TOEI_OEDO_LINE_ID
        : stations.every((s) => s.line?.id === TOEI_OEDO_LINE_ID),
    [line, stations]
  );

  const majorStationIds = useMemo(() => {
    if (isYamanoteLine) {
      return YAMANOTE_LINE_MAJOR_STATIONS_ID.sort((a, b) => a - b);
    }
    if (isOsakaLoopLine) {
      return OSAKA_LOOP_LINE_MAJOR_STATIONS_ID.sort((a, b) => a - b);
    }

    if (isMeijoLine) {
      return MEIJO_LINE_MAJOR_STATIONS_ID.sort((a, b) => a - b);
    }

    return [];
  }, [isMeijoLine, isOsakaLoopLine, isYamanoteLine]);

  const isLoopLine = useMemo((): boolean => {
    if (trainType && !getIsLocal(trainType)) {
      return false;
    }
    return isYamanoteLine || isOsakaLoopLine || isMeijoLine;
  }, [isMeijoLine, isOsakaLoopLine, isYamanoteLine, trainType]);

  const isPartiallyLoopLine = useMemo(
    () =>
      line
        ? line?.id === TOEI_OEDO_LINE_ID
        : stations.every((s) => s.line?.id === TOEI_OEDO_LINE_ID),

    [line, stations]
  );

  const inboundStationsForLoopLine = useMemo((): Station[] => {
    if (!station || !isLoopLine) {
      return [];
    }

    const reversedStations = stations.slice().reverse();

    const currentStationIndex = reversedStations.findIndex(
      (s) => s.groupId === station.groupId
    );

    // 配列の途中から走査しているので端っこだと表示されるべき駅が存在しないものとされるので、環状させる
    const majorStations = [
      ...reversedStations.slice(currentStationIndex),
      ...reversedStations.slice(0, currentStationIndex),
    ]
      .filter((s) => majorStationIds.includes(s.id))
      .filter((s) => s.groupId !== station.groupId)
      .filter((s, i, a) => a.findIndex((e) => e.groupId === s.groupId) === i);

    return majorStations.slice(0, 2);
  }, [isLoopLine, majorStationIds, station, stations]);

  const outboundStationsForLoopLine = useMemo((): Station[] => {
    if (!station || !isLoopLine) {
      return [];
    }

    const currentStationIndex = stations.findIndex(
      (s) => s.groupId === station.groupId
    );

    // 配列の途中から走査しているので端っこだと表示されるべき駅が存在しないものとされるので、環状させる
    const majorStations = [
      ...stations.slice(currentStationIndex),
      ...stations.slice(0, currentStationIndex),
    ]
      .filter((s) => majorStationIds.includes(s.id))
      .filter((s) => s.groupId !== station.groupId)
      .filter((s, i, a) => a.findIndex((e) => e.groupId === s.groupId) === i);

    return majorStations.slice(0, 2);
  }, [isLoopLine, majorStationIds, station, stations]);

  return {
    isYamanoteLine,
    isOsakaLoopLine,
    isMeijoLine,
    isOedoLine,
    isLoopLine,
    isPartiallyLoopLine,
    inboundStationsForLoopLine,
    outboundStationsForLoopLine,
  };
};
