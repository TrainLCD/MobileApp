import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import type { Station } from '~/@types/graphql';
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

  const station = originStation ?? currentStation;

  const stations = useMemo(
    () => dropEitherJunctionStation(stationsFromState, selectedDirection),
    [selectedDirection, stationsFromState]
  );

  const isInbound = selectedDirection === 'INBOUND';

  // OUTBOUND 用に reverse した配列をメモ化（必要なときだけ作る）。
  // 以前は useMemo を 2 つに分けて毎回 stations.slice().reverse() を 2 回計算していた。
  const reversedStations = useMemo(
    () => (isInbound ? null : stations.slice().reverse()),
    [isInbound, stations]
  );

  const result = useMemo(() => {
    const orderedStations = isInbound
      ? stations
      : (reversedStations ?? stations);
    const idMatchIndex = orderedStations.findIndex((s) => s.id === station?.id);
    const stationIndex =
      idMatchIndex !== -1
        ? idMatchIndex
        : orderedStations.findIndex((s) => s.groupId === station?.groupId);

    if (stationIndex === -1) {
      return undefined;
    }

    // ループ線とそれ以外で進行方向の取り方が違う。
    // INBOUND→reversedで stationIndex+1、OUTBOUND→reversedで stationIndex+1（共通）。
    const actualNextStation = (() => {
      if (isLoopLine) {
        // 元配列基準で INBOUND は -1, OUTBOUND は +1 だったが、
        // ここでは orderedStations が常に進行方向順なので +1 で揃えられる場合とそうでない場合がある。
        // 既存仕様を保つため元の挙動を再現する。
        const flatIndex = stations.findIndex((s) => s.id === station?.id);
        const groupIndex =
          flatIndex !== -1
            ? flatIndex
            : stations.findIndex((s) => s.groupId === station?.groupId);
        if (groupIndex === -1) {
          return undefined;
        }
        const loopLineStationIndex = isInbound
          ? groupIndex - 1
          : groupIndex + 1;
        if (!stations[loopLineStationIndex]) {
          return stations[isInbound ? stations.length - 1 : 0];
        }
        return stations[loopLineStationIndex];
      }

      // 非ループ線: orderedStations は進行方向順なので次は +1
      return orderedStations[stationIndex + 1];
    })();

    if (!actualNextStation) {
      return undefined;
    }

    if (!ignorePass || !getIsPass(actualNextStation)) {
      return actualNextStation;
    }

    // 通過駅をスキップして次の停車駅を探す
    for (let i = stationIndex + 1; i < orderedStations.length; i++) {
      const s = orderedStations[i];
      if (s && !getIsPass(s)) {
        return s;
      }
    }
    return undefined;
  }, [
    ignorePass,
    isInbound,
    isLoopLine,
    reversedStations,
    station?.groupId,
    station?.id,
    stations,
  ]);

  return result;
};
