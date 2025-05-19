import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
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

export const useLoopLine = () => {
  const { stations } = useRecoilValue(stationState);
  const station = useCurrentStation();
  const line = useCurrentLine();

  const trainType = useCurrentTrainType();

  const isYamanoteLine = useMemo(
    (): boolean => line?.id === YAMANOTE_LINE_ID,
    [line?.id]
  );
  const isOsakaLoopLine = useMemo(
    (): boolean => line?.id === OSASA_LOOP_LINE_ID,
    [line?.id]
  );
  const isMeijoLine = useMemo(
    (): boolean => line?.id === MEIJO_LINE_ID,
    [line?.id]
  );

  const isOnlyLoopLine = useMemo(
    () =>
      stations.filter(
        (s) =>
          s.line?.id === YAMANOTE_LINE_ID ||
          s.line?.id === OSASA_LOOP_LINE_ID ||
          s.line?.id === MEIJO_LINE_ID
      ).length === stations.length,
    [stations]
  );

  const majorStationIds = useMemo(() => {
    if (!line) {
      return [];
    }

    if (isYamanoteLine) {
      return YAMANOTE_LINE_MAJOR_STATIONS_ID;
    }
    if (isOsakaLoopLine) {
      return OSAKA_LOOP_LINE_MAJOR_STATIONS_ID;
    }

    if (isMeijoLine) {
      return MEIJO_LINE_MAJOR_STATIONS_ID;
    }

    return [];
  }, [isMeijoLine, isOsakaLoopLine, isYamanoteLine, line]);

  const isLoopLine = useMemo((): boolean => {
    if (!line || (trainType && !getIsLocal(trainType))) {
      return false;
    }
    return isYamanoteLine || isOsakaLoopLine || isMeijoLine;
  }, [isMeijoLine, isOsakaLoopLine, isYamanoteLine, line, trainType]);

  const isPartiallyLoopLine = useMemo(
    () => line?.id === TOEI_OEDO_LINE_ID,
    [line?.id]
  );

  const inboundStationsForLoopLine = useMemo((): Station[] => {
    if (!line || !station || !isLoopLine) {
      return [];
    }

    const reversedStations = stations.slice().reverse();

    const currentStationIndex = reversedStations.findIndex(
      (s) => s.id === station.id
    );

    // 配列の途中から走査しているので端っこだと表示されるべき駅が存在しないものとされるので、環状させる
    const majorStations = [
      ...reversedStations.slice(currentStationIndex),
      ...reversedStations.slice(0, currentStationIndex),
    ]
      .filter((s) => majorStationIds.includes(s.id))
      .filter((s) => s.id !== station.id)
      .filter((s, i, a) => a.findIndex((e) => e.id === s.id) === i);

    return majorStations.slice(0, 2);
  }, [isLoopLine, line, majorStationIds, station, stations]);

  const outboundStationsForLoopLine = useMemo((): Station[] => {
    if (!line || !station || !isLoopLine) {
      return [];
    }

    const currentStationIndex = stations.findIndex((s) => s.id === station.id);

    // 配列の途中から走査しているので端っこだと表示されるべき駅が存在しないものとされるので、環状させる
    const majorStations = [
      ...stations.slice(currentStationIndex),
      ...stations.slice(0, currentStationIndex),
    ]
      .filter((s) => majorStationIds.includes(s.id))
      .filter((s) => s.id !== station.id)
      .filter((s, i, a) => a.findIndex((e) => e.id === s.id) === i);

    return majorStations.slice(0, 2);
  }, [isLoopLine, line, majorStationIds, station, stations]);

  return {
    isYamanoteLine,
    isOsakaLoopLine,
    isMeijoLine,
    isLoopLine,
    isPartiallyLoopLine,
    inboundStationsForLoopLine,
    outboundStationsForLoopLine,
  };
};
