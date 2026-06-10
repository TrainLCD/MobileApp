import { useAtomValue } from 'jotai';
import type { Station } from '../@types/graphql';
import type { LineDirection } from '../models/Bound';
import {
  selectedDirectionAtom,
  stationAtom,
  stationsAtom,
} from '../store/atoms/station';
import getIsPass from '../utils/isPass';
import { memoizeLastCalls } from '../utils/memoizeLastCalls';

// 本フックは30箇所以上から呼ばれるため、O(n)走査をインスタンスごとのuseMemoではなく
// モジュールレベルの共有キャッシュで1回に集約する(同一入力なら全呼び出し元が
// 同一の結果参照を受け取る)。

// NOTE: 選択した路線と現在の駅の路線を一致させる
// 元は find を 2 回チェーンしていたが 1 パスに集約。
const findBasicCurrentStation = memoizeLastCalls(
  (
    stations: Station[],
    stationId: number | null | undefined,
    stationGroupId: number | null | undefined
  ): Station | undefined => {
    if (!stationId && !stationGroupId) return undefined;
    let groupMatch: Station | undefined;
    for (const s of stations) {
      if (s.id === stationId) return s;
      if (!groupMatch && s.groupId === stationGroupId) {
        groupMatch = s;
      }
    }
    return groupMatch;
  }
);

// skipPass / withTrainTypes が必要な呼び出しでのみ算出する。
const findWithTrainTypeStation = memoizeLastCalls(
  (
    stations: Station[],
    selectedDirection: LineDirection | null,
    skipPassStation: boolean,
    stationId: number | null | undefined
  ): Station | undefined => {
    // 直接マッチを 1 パスで探す
    for (const rs of stations) {
      if (skipPassStation && getIsPass(rs)) continue;
      if (rs.id === stationId) return rs;
    }

    // INBOUND 時は元配列、OUTBOUND 時は逆順で curIndex を求める。
    // ただしフル配列を slice().reverse() しなくても、逆方向ループで等価に処理できる。
    const isInbound = selectedDirection === 'INBOUND';
    const len = stations.length;
    let curIndex = -1;
    for (let i = 0; i < len; i++) {
      const idx = isInbound ? i : len - 1 - i;
      if (stations[idx]?.id === stationId) {
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
  }
);

export const useCurrentStation = (
  skipPassStation = false,
  withTrainTypes = false
): Station | undefined => {
  const stations = useAtomValue(stationsAtom);
  const stationFromState = useAtomValue(stationAtom);
  const selectedDirection = useAtomValue(selectedDirectionAtom);

  const station = findBasicCurrentStation(
    stations,
    stationFromState?.id,
    stationFromState?.groupId
  );

  if (skipPassStation || withTrainTypes) {
    return findWithTrainTypeStation(
      stations,
      selectedDirection ?? null,
      skipPassStation,
      station?.id
    );
  }

  // NOTE: 路線が選択されていない場合stationはnullishになる
  return station ?? stationFromState ?? undefined;
};
