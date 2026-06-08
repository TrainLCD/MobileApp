import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import type { Station } from '../@types/graphql';
import stationState from '../store/atoms/station';
import getIsPass from '../utils/isPass';

export const useCurrentStation = (
  skipPassStation = false,
  withTrainTypes = false
): Station | undefined => {
  const {
    stations,
    station: stationFromState,
    selectedDirection,
  } = useAtomValue(stationState);

  // NOTE: 選択した路線と現在の駅の路線を一致させる
  // 元は find を 2 回チェーンしていたが 1 パスに集約。
  const station = useMemo(() => {
    if (!stationFromState?.id && !stationFromState?.groupId) return undefined;
    let groupMatch: Station | undefined;
    for (const s of stations) {
      if (s.id === stationFromState.id) return s;
      if (!groupMatch && s.groupId === stationFromState.groupId) {
        groupMatch = s;
      }
    }
    return groupMatch;
  }, [stationFromState?.id, stationFromState?.groupId, stations]);

  const needsTrainTypeStation = skipPassStation || withTrainTypes;

  // skipPass / withTrainTypes が必要な呼び出しでのみ算出する。
  // 以前は常時計算しており stations.slice().reverse() のコストが必ず発生していた。
  const withTrainTypeStation = useMemo(() => {
    if (!needsTrainTypeStation) return undefined;
    // 直接マッチを 1 パスで探す
    for (const rs of stations) {
      if (skipPassStation && getIsPass(rs)) continue;
      if (rs.id === station?.id) return rs;
    }

    // INBOUND 時は元配列、OUTBOUND 時は逆順で curIndex を求める。
    // ただしフル配列を slice().reverse() しなくても、逆方向ループで等価に処理できる。
    const isInbound = selectedDirection === 'INBOUND';
    const len = stations.length;
    let curIndex = -1;
    for (let i = 0; i < len; i++) {
      const idx = isInbound ? i : len - 1 - i;
      if (stations[idx]?.id === station?.id) {
        curIndex = i;
        break;
      }
    }
    if (curIndex === -1) return undefined;

    // reversed[0..curIndex) を後ろから前へ走査して直近停車駅を返す
    for (let j = curIndex - 1; j >= 0; j--) {
      const idx = isInbound ? j : len - 1 - j;
      const s = stations[idx];
      if (!s) continue;
      if (skipPassStation && getIsPass(s)) continue;
      return s;
    }
    return undefined;
  }, [
    needsTrainTypeStation,
    selectedDirection,
    skipPassStation,
    station?.id,
    stations,
  ]);

  if (needsTrainTypeStation) {
    return withTrainTypeStation;
  }

  // NOTE: 路線が選択されていない場合stationはnullishになる
  return station ?? stationFromState ?? undefined;
};
