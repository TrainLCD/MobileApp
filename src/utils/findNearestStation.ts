import type { Station } from '~/@types/graphql';
import type { LineDirection } from '~/models/Bound';

/**
 * 列車種別変更時に、現在駅が新しい駅リストに存在しない場合、
 * 旧駅リストでの位置を基準に進行方向で最も近い駅を探す。
 *
 * 大江戸線の都庁前(外回り/内回り)のように、groupIdが同じでもidが異なる駅が
 * 旧駅リスト中に複数存在しうる。groupIdだけで現在地の位置を特定すると、
 * 常に配列中で先に見つかる方(必ずしも現在地と同じ出現ではない)に固定されて
 * しまうため、idで一意に特定する。
 *
 * @param oldStations 旧駅リスト
 * @param newStations 新しい駅リスト
 * @param currentStationId 現在駅のid
 * @param direction 進行方向
 * @returns 最寄りの駅（見つからない場合は null）
 */
export const findNearestStation = (
  oldStations: Station[],
  newStations: Station[],
  currentStationId: number | null | undefined,
  direction: LineDirection | null
): Station | null => {
  if (currentStationId == null || !direction) {
    return null;
  }

  const currentIdx = oldStations.findIndex((s) => s.id === currentStationId);
  if (currentIdx === -1) {
    return null;
  }

  const newStationsById = new Map(
    newStations.filter((s) => s.id != null).map((s) => [s.id, s])
  );

  if (direction === 'INBOUND') {
    for (let i = currentIdx + 1; i < oldStations.length; i++) {
      const candidateId = oldStations[i]?.id;
      if (candidateId == null) continue;
      const found = newStationsById.get(candidateId);
      if (found) {
        return found;
      }
    }
  } else {
    for (let i = currentIdx - 1; i >= 0; i--) {
      const candidateId = oldStations[i]?.id;
      if (candidateId == null) continue;
      const found = newStationsById.get(candidateId);
      if (found) {
        return found;
      }
    }
  }

  return null;
};
