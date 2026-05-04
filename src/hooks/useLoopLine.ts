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

  // OUTBOUND/INBOUND どちらでも参照されうる reverse 結果をメモ化。
  // 以前は inboundStationsForLoopLine が呼ばれる度にフル配列を slice().reverse() していた。
  const reversedStations = useMemo(
    () => stations.slice().reverse(),
    [stations]
  );

  const inboundStationsForLoopLine = useMemo((): Station[] => {
    if (!station || !isLoopLine) {
      return [];
    }

    const currentStationIndex = reversedStations.findIndex(
      (s) => s.groupId === station.groupId
    );

    // 配列の途中から走査しているので端っこだと表示されるべき駅が存在しないものとされるので、環状させる
    const seenGroupIds = new Set<number>();
    const majorStations: Station[] = [];
    // 連結配列を物理生成せず 2 段スキャンで集める
    const total = reversedStations.length;
    for (let step = 0; step < total && majorStations.length < 2; step++) {
      const idx = (currentStationIndex + step) % total;
      const s = reversedStations[idx];
      if (!s || s.id == null || !majorStationIdSet.has(s.id)) continue;
      if (s.groupId === station.groupId) continue;
      if (s.groupId != null) {
        if (seenGroupIds.has(s.groupId)) continue;
        seenGroupIds.add(s.groupId);
      }
      majorStations.push(s);
    }
    return majorStations;
  }, [isLoopLine, majorStationIdSet, station, reversedStations]);

  const outboundStationsForLoopLine = useMemo((): Station[] => {
    if (!station || !isLoopLine) {
      return [];
    }

    const currentStationIndex = stations.findIndex(
      (s) => s.groupId === station.groupId
    );

    // 配列の途中から走査しているので端っこだと表示されるべき駅が存在しないものとされるので、環状させる
    const seenGroupIds = new Set<number>();
    const majorStations: Station[] = [];
    const total = stations.length;
    for (let step = 0; step < total && majorStations.length < 2; step++) {
      const idx = (currentStationIndex + step) % total;
      const s = stations[idx];
      if (!s || s.id == null || !majorStationIdSet.has(s.id)) continue;
      if (s.groupId === station.groupId) continue;
      if (s.groupId != null) {
        if (seenGroupIds.has(s.groupId)) continue;
        seenGroupIds.add(s.groupId);
      }
      majorStations.push(s);
    }
    return majorStations;
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
