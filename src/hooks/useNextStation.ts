import { useAtomValue } from 'jotai';
import type { Station } from '~/@types/graphql';
import dropEitherJunctionStation from '~/utils/dropJunctionStation';
import { memoizeLastCalls } from '~/utils/memoizeLastCalls';
import reverseStations from '~/utils/reverseStations';
import { selectedDirectionAtom, stationsAtom } from '../store/atoms/station';
import getIsPass from '../utils/isPass';
import { useCurrentStation } from './useCurrentStation';
import { useLoopLine } from './useLoopLine';

// 本フックは20箇所以上から呼ばれ、originStation違いの呼び出しも同一レンダー内で
// 混在するため、O(n)走査をインスタンスごとのuseMemoではなくモジュールレベルの
// 共有キャッシュ(複数スロット)で集約する。
const computeNextStation = memoizeLastCalls(
  (
    stations: Station[],
    reversedStations: Station[] | null,
    isInbound: boolean,
    isLoopLine: boolean,
    stationId: number | null | undefined,
    stationGroupId: number | null | undefined,
    ignorePass: boolean
  ): Station | undefined => {
    const orderedStations = isInbound
      ? stations
      : (reversedStations ?? stations);
    const idMatchIndex = orderedStations.findIndex((s) => s.id === stationId);
    const stationIndex =
      idMatchIndex !== -1
        ? idMatchIndex
        : orderedStations.findIndex((s) => s.groupId === stationGroupId);

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
        const flatIndex = stations.findIndex((s) => s.id === stationId);
        const groupIndex =
          flatIndex !== -1
            ? flatIndex
            : stations.findIndex((s) => s.groupId === stationGroupId);
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
  }
);

export const useNextStation = (
  ignorePass = true,
  originStation?: Station
): Station | undefined => {
  const stationsFromState = useAtomValue(stationsAtom);
  const selectedDirection = useAtomValue(selectedDirectionAtom);
  const currentStation = useCurrentStation();
  const { isLoopLine } = useLoopLine();

  const station = originStation ?? currentStation;

  // dropEitherJunctionStation / reverseStations はモジュールレベルでメモ化済みのため、
  // 全インスタンスが同一の配列参照を共有する
  const stations = dropEitherJunctionStation(
    stationsFromState,
    selectedDirection
  );
  const isInbound = selectedDirection === 'INBOUND';
  const reversedStations = isInbound ? null : reverseStations(stations);

  return computeNextStation(
    stations,
    reversedStations,
    isInbound,
    isLoopLine,
    station?.id,
    station?.groupId,
    ignorePass
  );
};
