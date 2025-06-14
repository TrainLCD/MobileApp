import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import stationState from '../store/atoms/station';
import getIsPass from '../utils/isPass';

export const useCurrentStation = (
  skipPassStation = false,
  withTrainTypes = false
) => {
  const {
    stations,
    station: stationFromState,
    selectedDirection,
    selectedBound,
  } = useAtomValue(stationState);

  // NOTE: 選択した路線と現在の駅の路線を一致させる
  const station = useMemo(() => {
    if (!selectedBound) {
      return stations.find((s) => s.groupId === stationFromState?.groupId);
    }

    const foundStation = stations.find((s) => s.id === stationFromState?.id);
    if (foundStation) {
      return foundStation;
    }

    return stations.find((s) => s.groupId === stationFromState?.groupId);
  }, [
    stationFromState?.id,
    stationFromState?.groupId,
    stations,
    selectedBound,
  ]);

  const withTrainTypeStation = useMemo(() => {
    const foundStation =
      stations
        .filter((s) => (skipPassStation ? !getIsPass(s) : true))
        .find((rs) => rs.id === station?.id) ??
      stations
        .filter((s) => (skipPassStation ? !getIsPass(s) : true))
        .find((rs) => rs.groupId === station?.groupId);
    if (foundStation) {
      return foundStation;
    }

    const reversedStations =
      selectedDirection === 'INBOUND' ? stations : stations.slice().reverse();

    const curIndex =
      reversedStations.findIndex((s) => s.id === station?.id) ??
      reversedStations.findIndex((s) => s.groupId === station?.groupId);
    const stationsFromRange = reversedStations
      .slice(0, curIndex)
      .filter((s) => (skipPassStation ? !getIsPass(s) : true));
    return stationsFromRange[stationsFromRange.length - 1] ?? null;
  }, [
    selectedDirection,
    skipPassStation,
    station?.id,
    station?.groupId,
    stations,
  ]);

  if (skipPassStation || withTrainTypes) {
    return withTrainTypeStation;
  }

  // NOTE: 路線が選択されていない場合stationはnullishになる
  return station ?? stationFromState;
};
