import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import type { Station } from '~/@types/graphql';
import stationState from '../store/atoms/station';
import dropEitherJunctionStation from '../utils/dropJunctionStation';
import getIsPass from '../utils/isPass';
import reverseStations from '../utils/reverseStations';
import { useApproachingStation } from './useApproachingStation';
import { useCurrentStation } from './useCurrentStation';
import { useLoopLine } from './useLoopLine';

/**
 * LineBoard など「現在駅」を起点に描画する表示面で使う、現在地基準の現在駅アクセサ。
 *
 * ヘッダーの「まもなく」は useDisplayNextStation → useApproachingStation(GPS基準)で
 * 次の停車駅を出すため、到着取りこぼし(arrived検知漏れ)で stationState.station が古く
 * なると、ヘッダーは正しい次駅へ自己修復するのに LineBoard は記録上の現在駅基準のまま
 * 1駅遅れ、「ヘッダーのまもなく駅 ≠ LineBoard の次駅」という不整合が起きる。
 *
 * 本フックは接近中のみ、接近駅(=次の停車駅)の1つ手前の停車駅を現在駅として返し、
 * LineBoard をヘッダーと同じ GPS 基準に追従させる。これにより
 * useNextStation(true, useDisplayCurrentStation()) === useApproachingStation()
 * が成り立ち、両者が常に一致する。
 *
 * 重要(デグレ防止): 前方への補正が必要なとき(取りこぼし時)だけ healed 値を返し、
 * それ以外(非接近・GPS無し・通常運行・ループ線)は useCurrentStation() をそのまま返す。
 * 通常運行・通過駅・発車直後では従来の挙動と完全に一致する。
 */
export const useDisplayCurrentStation = (): Station | undefined => {
  const {
    approaching,
    stations: stationsFromState,
    selectedDirection,
  } = useAtomValue(stationState);
  const currentStation = useCurrentStation();
  const approachingStation = useApproachingStation();
  // ループ線は環状スライスのインデックス折返しが複雑なため、現状の挙動を維持する
  // (補正対象外。両者とも非補正の同一アンカーになるため新たな不整合は生まない)。
  const { isLoopLine } = useLoopLine();

  const healedStation = useMemo<Station | undefined>(() => {
    if (!approaching || !approachingStation || isLoopLine) {
      return undefined;
    }

    const ordered = dropEitherJunctionStation(
      stationsFromState,
      selectedDirection
    );
    // reverseStationsは共有キャッシュ付きのため、useNextStation等と逆順配列を共有できる
    const directional =
      selectedDirection === 'INBOUND' ? ordered : reverseStations(ordered);

    const findIndexByIdentity = (target: Station | undefined): number => {
      if (!target) {
        return -1;
      }
      const byId = directional.findIndex((s) => s.id === target.id);
      return byId !== -1
        ? byId
        : directional.findIndex((s) => s.groupId === target.groupId);
    };

    const approachingIndex = findIndexByIdentity(approachingStation);
    if (approachingIndex <= 0) {
      return undefined;
    }

    // 接近駅(次の停車駅)の1つ手前の停車駅(通過駅はスキップ)を現在駅とみなす
    let predecessor: Station | undefined;
    for (let i = approachingIndex - 1; i >= 0; i--) {
      const s = directional[i];
      if (s && !getIsPass(s)) {
        predecessor = s;
        break;
      }
    }
    if (!predecessor) {
      return undefined;
    }

    // 前方への補正のときだけ healed 値を採用する。
    // 通常運行では predecessor は現在駅と一致(または手前)になるため undefined を返し、
    // useCurrentStation() のフォールバックで従来挙動を完全維持する。
    const currentIndex = findIndexByIdentity(currentStation);
    const predecessorIndex = directional.findIndex(
      (s) => s.groupId === predecessor?.groupId
    );
    if (currentIndex !== -1 && predecessorIndex <= currentIndex) {
      return undefined;
    }

    return predecessor;
  }, [
    approaching,
    approachingStation,
    currentStation,
    isLoopLine,
    selectedDirection,
    stationsFromState,
  ]);

  return healedStation ?? currentStation;
};
