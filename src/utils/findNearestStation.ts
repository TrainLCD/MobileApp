import type { Station } from '~/@types/graphql';
import type { LineDirection } from '~/models/Bound';

/**
 * 列車種別変更時に、現在駅が新しい駅リストに存在しない場合、
 * 旧駅リストでの位置を基準に進行方向で最も近い駅を探す。
 *
 * @param oldStations 旧駅リスト
 * @param newStations 新しい駅リスト
 * @param currentGroupId 現在駅のgroupId
 * @param direction 進行方向
 * @returns 最寄りの駅（見つからない場合は null）
 */
export const findNearestStation = (
  oldStations: Station[],
  newStations: Station[],
  currentGroupId: number | null | undefined,
  direction: LineDirection | null
): Station | null => {
  if (currentGroupId == null || !direction) {
    return null;
  }

  const currentIdx = oldStations.findIndex((s) => s.groupId === currentGroupId);
  if (currentIdx === -1) {
    return null;
  }

  if (direction === 'INBOUND') {
    for (let i = currentIdx + 1; i < oldStations.length; i++) {
      const found = newStations.find(
        (s) => s.groupId === oldStations[i]?.groupId
      );
      if (found) {
        return found;
      }
    }
  } else {
    for (let i = currentIdx - 1; i >= 0; i--) {
      const found = newStations.find(
        (s) => s.groupId === oldStations[i]?.groupId
      );
      if (found) {
        return found;
      }
    }
  }

  return null;
};
