import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import type { Station } from '~/@types/graphql';
import {
  DISNEY_RESORT_LINE_ID,
  DISNEY_RESORT_LINE_MAJOR_STATIONS_ID,
  MEIJO_LINE_ID,
  MEIJO_LINE_MAJOR_STATIONS_ID,
  OSAKA_LOOP_LINE_ID,
  OSAKA_LOOP_LINE_MAJOR_STATIONS_ID,
  TOEI_OEDO_LINE_ID,
  YAMANOTE_LINE_ID,
  YAMANOTE_LINE_MAJOR_STATIONS_ID,
} from '~/constants';
import reverseStations from '~/utils/reverseStations';
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
  const isDisneyResortLine = useMemo(
    (): boolean =>
      line
        ? line?.id === DISNEY_RESORT_LINE_ID
        : stations.every((s) => s.line?.id === DISNEY_RESORT_LINE_ID),
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

    if (isDisneyResortLine) {
      return new Set(DISNEY_RESORT_LINE_MAJOR_STATIONS_ID);
    }

    return new Set<number>();
  }, [isDisneyResortLine, isMeijoLine, isOsakaLoopLine, isYamanoteLine]);

  const isLoopLine = useMemo((): boolean => {
    if (trainType && !getIsLocal(trainType)) {
      return false;
    }
    return (
      isYamanoteLine || isOsakaLoopLine || isMeijoLine || isDisneyResortLine
    );
  }, [
    isDisneyResortLine,
    isMeijoLine,
    isOsakaLoopLine,
    isYamanoteLine,
    trainType,
  ]);

  const isPartiallyLoopLine = useMemo(
    () =>
      line
        ? line?.id === TOEI_OEDO_LINE_ID
        : stations.every((s) => s.line?.id === TOEI_OEDO_LINE_ID),

    [line, stations]
  );

  // OUTBOUND/INBOUND どちらでも参照されうる reverse 結果を共有キャッシュから取得。
  // インスタンスごとの useMemo では複数の呼び出し元それぞれで slice().reverse() が
  // 走っていたため、モジュールレベルのキャッシュ(reverseStations)で1回に集約する。
  const reversedStations = reverseStations(stations);

  const inboundStationsForLoopLine = useMemo((): Station[] => {
    if (!station || !isLoopLine) {
      return [];
    }

    // ディズニーリゾートラインは反時計回り (=API 駅順方向=OUTBOUND) の一方向運行。
    // 時計回り側 (INBOUND) を経路探索・行先表示の候補に含めないため常に空配列を返す。
    if (isDisneyResortLine) {
      return [];
    }

    const currentStationIndex = reversedStations.findIndex(
      (s) => s.groupId === station.groupId
    );
    // findIndex が -1 の場合、(-1 + step) % total は負値起点になり末尾要素を取りこぼす。
    // overrideStations 等で current station が配列に居ないケースを安全に扱うため早期 return。
    if (currentStationIndex === -1) {
      return [];
    }

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
  }, [
    isDisneyResortLine,
    isLoopLine,
    majorStationIdSet,
    station,
    reversedStations,
  ]);

  const outboundStationsForLoopLine = useMemo((): Station[] => {
    if (!station || !isLoopLine) {
      return [];
    }

    const currentStationIndex = stations.findIndex(
      (s) => s.groupId === station.groupId
    );
    if (currentStationIndex === -1) {
      return [];
    }

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
    isDisneyResortLine,
    isLoopLine,
    isPartiallyLoopLine,
    inboundStationsForLoopLine,
    outboundStationsForLoopLine,
  };
};
