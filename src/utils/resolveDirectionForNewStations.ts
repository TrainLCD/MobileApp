import type { Station } from '~/@types/graphql';
import type { LineDirection } from '~/models/Bound';

const indexOfStation = (
  stations: Station[],
  station: Station | null | undefined
): number => {
  if (!station) {
    return -1;
  }
  // 直通系統では同じ駅でも駅IDが変わりうるため、idで引けなければgroupIdで読み替える
  const byId =
    station.id != null ? stations.findIndex((s) => s.id === station.id) : -1;
  if (byId !== -1) {
    return byId;
  }
  return station.groupId != null
    ? stations.findIndex((s) => s.groupId === station.groupId)
    : -1;
};

/**
 * 列車種別の変更で駅リストが別系統のものへ入れ替わったとき、
 * 実際の進行方向を新しい駅リストの並び基準で引き直す。
 *
 * INBOUND / OUTBOUND は「配列の末尾方向 / 先頭方向」でしかないため、
 * 系統が変わると同じ値が逆向きを指しうる。例えば上野東京ライン経由の
 * 常磐線快速(品川→原ノ町)と東海道線の普通(東京→沼津)は品川・新橋・東京を
 * 共有しつつ並び順が逆になるので、旧系統の値をそのまま引き継ぐと逆方向が案内される。
 *
 * 旧駅リスト上で現在駅から進行方向へ並ぶ駅のうち、新駅リストにも存在するものを
 * 2駅拾い、その2駅が新駅リストでどちらへ進むかで方向を決める。
 *
 * @param oldStations 旧駅リスト
 * @param newStations 新しい駅リスト
 * @param currentStation 現在駅(旧駅リスト基準)
 * @param prevDirection 旧駅リスト基準の進行方向
 * @returns 新駅リスト基準の進行方向(判定できない場合は prevDirection)
 */
export const resolveDirectionForNewStations = (
  oldStations: Station[],
  newStations: Station[],
  currentStation: Station | null | undefined,
  prevDirection: LineDirection | null
): LineDirection | null => {
  if (!prevDirection || newStations.length < 2) {
    return prevDirection;
  }

  const currentIdxInOld = indexOfStation(oldStations, currentStation);
  if (currentIdxInOld === -1) {
    return prevDirection;
  }

  const step = prevDirection === 'INBOUND' ? 1 : -1;
  const anchors: number[] = [];
  for (
    let i = currentIdxInOld;
    i >= 0 && i < oldStations.length && anchors.length < 2;
    i += step
  ) {
    const idx = indexOfStation(newStations, oldStations[i]);
    if (idx !== -1 && !anchors.includes(idx)) {
      anchors.push(idx);
    }
  }

  // 新旧で共有する駅が1駅以下だと並び順を比べられないため、従来の方向を維持する
  if (anchors.length < 2) {
    return prevDirection;
  }

  return (anchors[1] as number) > (anchors[0] as number)
    ? 'INBOUND'
    : 'OUTBOUND';
};
