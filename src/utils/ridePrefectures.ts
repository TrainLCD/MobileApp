import type { RideSessionWithStops } from '~/lib/rideLog';
import { measureRide, type RidePeriodRange } from '~/utils/rideStats';

/**
 * 振り返り機能(#5751)の都道府県ごとの集計(#7123)。集計(src/utils/rideStats.ts)と同じ
 * 乗車・同じ駅の範囲を、measureRide が集計に使った駅でたどる。
 */

export type RidePrefectureStats = {
  // 1〜47。名前は src/constants/province.ts を prefectureId - 1 で引く
  prefectureId: number;
  distanceMeters: number;
};

export type RidePrefectures = {
  // 到着を検出した駅(出発駅を含む)がある都道府県。距離の長い順。
  // 同じ距離なら prefectureId の小さい順
  prefectures: RidePrefectureStats[];
  // 乗車回数に数えたのに、都道府県の分かる駅が1つも無い乗車の数。
  // 都道府県を記録する前に記録した乗車がこれに当たる
  unrecordedRideCount: number;
};

/**
 * 期間に乗りはじめた乗車を、都道府県ごとにまとめる。
 *
 * - 訪れた都道府県は、到着を検出した駅(出発駅を含む)の都道府県だけを数える。通過駅は数えない。
 * - 距離は、駅と駅のあいだを到着した側の駅の都道府県に数える(路線ごとの距離と同じ数え方)。
 *   到着した側が通過駅でも、その駅の都道府県に数える。
 * - 通過しただけで、どの駅にも到着していない都道府県は一覧に出さない。その距離も出さない。
 */
export const summarizeRidePrefectures = (
  sessions: RideSessionWithStops[],
  range: RidePeriodRange
): RidePrefectures => {
  const startMs = range.start.getTime();
  const endMs = range.end.getTime();

  const visited = new Set<number>();
  const distances = new Map<number, number>();
  let unrecordedRideCount = 0;

  for (const session of sessions) {
    if (session.startedAt < startMs || session.startedAt >= endMs) {
      continue;
    }
    const { stops } = measureRide(session);
    if (stops.length === 0) {
      continue;
    }
    if (stops.every((stop) => stop.prefectureId == null)) {
      unrecordedRideCount += 1;
      continue;
    }
    stops.forEach((stop, index) => {
      if (stop.prefectureId == null) {
        return;
      }
      if (stop.kind === 'arrived') {
        visited.add(stop.prefectureId);
      }
      // 出発駅の distanceFromPrevious は 0 なので、足しても変わらない
      if (index > 0) {
        distances.set(
          stop.prefectureId,
          (distances.get(stop.prefectureId) ?? 0) + stop.distanceFromPrevious
        );
      }
    });
  }

  const prefectures = [...visited]
    .map((prefectureId) => ({
      prefectureId,
      distanceMeters: distances.get(prefectureId) ?? 0,
    }))
    .sort(
      (a, b) =>
        b.distanceMeters - a.distanceMeters || a.prefectureId - b.prefectureId
    );

  return { prefectures, unrecordedRideCount };
};
