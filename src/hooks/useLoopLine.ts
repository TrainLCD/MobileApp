import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import type { Station } from '~/@types/graphql';
import {
  MEIJO_LINE_ID,
  MEIJO_LINE_MAJOR_STATIONS_ID,
  OSAKA_LOOP_LINE_ID,
  OSAKA_LOOP_LINE_MAJOR_STATIONS_ID,
  TOEI_OEDO_LINE_ID,
  YAMANOTE_LINE_ID,
  YAMANOTE_LINE_MAJOR_STATIONS_ID,
} from '~/constants';
import { getIsLocal } from '~/utils/trainTypeString';
import stationState from '../store/atoms/station';
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
        ? line?.id === OSAKA_LOOP_LINE_ID
        : stations.every((s) => s.line?.id === OSAKA_LOOP_LINE_ID),
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

  const majorStationIdSet = useMemo(() => {
    if (isYamanoteLine) {
      return new Set(YAMANOTE_LINE_MAJOR_STATIONS_ID);
    }
    if (isOsakaLoopLine) {
      return new Set(OSAKA_LOOP_LINE_MAJOR_STATIONS_ID);
    }

    if (isMeijoLine) {
      return new Set(MEIJO_LINE_MAJOR_STATIONS_ID);
    }

    return new Set<number>();
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
    const seenGroupIds = new Set<number>();
    const majorStations = [
      ...reversedStations.slice(currentStationIndex),
      ...reversedStations.slice(0, currentStationIndex),
    ].filter((s) => {
      if (s.id === undefined || s.id === null || !majorStationIdSet.has(s.id)) {
        return false;
      }
      if (s.groupId === station.groupId) {
        return false;
      }
      if (s.groupId != null && seenGroupIds.has(s.groupId)) {
        return false;
      }
      if (s.groupId != null) {
        seenGroupIds.add(s.groupId);
      }
      return true;
    });

    return majorStations.slice(0, 2);
  }, [isLoopLine, majorStationIdSet, station, stations]);

  const outboundStationsForLoopLine = useMemo((): Station[] => {
    if (!station || !isLoopLine) {
      return [];
    }

    const currentStationIndex = stations.findIndex(
      (s) => s.groupId === station.groupId
    );

    // 配列の途中から走査しているので端っこだと表示されるべき駅が存在しないものとされるので、環状させる
    const seenGroupIds = new Set<number>();
    const majorStations = [
      ...stations.slice(currentStationIndex),
      ...stations.slice(0, currentStationIndex),
    ].filter((s) => {
      if (s.id === undefined || s.id === null || !majorStationIdSet.has(s.id)) {
        return false;
      }
      if (s.groupId === station.groupId) {
        return false;
      }
      if (s.groupId != null && seenGroupIds.has(s.groupId)) {
        return false;
      }
      if (s.groupId != null) {
        seenGroupIds.add(s.groupId);
      }
      return true;
    });

    return majorStations.slice(0, 2);
  }, [isLoopLine, majorStationIdSet, station, stations]);

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
