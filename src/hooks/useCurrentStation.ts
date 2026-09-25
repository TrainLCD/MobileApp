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

// 進行方向に 1 つ先の駅。INBOUND は配列順、OUTBOUND は配列の逆順に進む
const getStationAhead = (
  stations: Station[],
  index: number,
  direction: LineDirection | null
): Station | undefined =>
  direction === 'OUTBOUND' ? stations[index - 1] : stations[index + 1];

// 本フックは30箇所以上から呼ばれるため、O(n)走査をインスタンスごとのuseMemoではなく
// モジュールレベルの共有キャッシュで1回に集約する(同一入力なら全呼び出し元が
// 同一の結果参照を受け取る)。

// NOTE: 選択した路線と現在の駅の路線を一致させる
// 元は find を 2 回チェーンしていたが 1 パスに集約。
// 接続駅は前の路線の駅と次の路線の駅として 2 回並ぶ。到着判定は座標の近い駅を
// stationAtom に入れるので、接続駅に着くと前の路線の駅が入ることがある。
// 着いた後は次の路線の駅を返し、ナンバリングなどを種別・路線(useCurrentLine)と
// 同じ次の路線に揃える(#7058)。着く前の次の駅(useNextStation)は
// dropEitherJunctionStation が残す前の路線の駅のままにする
const findBasicCurrentStation = memoizeLastCalls(
  (
    stations: Station[],
    selectedDirection: LineDirection | null,
    stationId: number | null | undefined,
    stationGroupId: number | null | undefined
  ): Station | undefined => {
    if (!stationId && !stationGroupId) return undefined;
    const resolveJunction = (index: number): Station => {
      const s = stations[index];
      const ahead = getStationAhead(stations, index, selectedDirection);
      return ahead && s.groupId != null && ahead.groupId === s.groupId
        ? ahead
        : s;
    };
    let groupMatchIndex = -1;
    for (let i = 0; i < stations.length; i++) {
      const s = stations[i];
      if (s.id === stationId) return resolveJunction(i);
      if (groupMatchIndex === -1 && s.groupId === stationGroupId) {
        groupMatchIndex = i;
      }
    }
    return groupMatchIndex === -1
      ? undefined
      : resolveJunction(groupMatchIndex);
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
    selectedDirection ?? null,
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
