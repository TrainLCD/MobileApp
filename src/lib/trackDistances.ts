/**
 * 隣り合う2駅のあいだの線路の長さ(m)を、駅の組ごとに覚えておく表。
 * 振り返り機能(#5751)の乗車距離に使う(#7103)。
 *
 * StationAPI は lineStations / lineGroupStations / stations(ids) で、返す駅の並びで
 * 直前にある駅からの線路の長さを trackDistanceFromPrevious として返す
 * (stations(ids) の並びは指定した ids の順)。一方アプリは、その並びを経路検索で
 * 逆向きにしたり、途中の駅を間引いたりしてから stationsAtom に入れる。並びが
 * 変わると「直前の駅」が別の駅を指してしまうため、API の並びのまま受け取った
 * 時点で駅の組に直して覚え、乗車ログは組で引く。
 */

type StationWithTrackDistance = {
  id?: number | null;
  trackDistanceFromPrevious?: number | null;
};

const distances = new Map<string, number>();

// 向きを問わずに引けるよう、小さい ID を先にしたキーにする
const pairKey = (a: number, b: number): string =>
  a < b ? `${a}:${b}` : `${b}:${a}`;

/**
 * 問い合わせが返した並びのまま渡す。並べ替えたあとの配列を渡してはいけない。
 */
export const rememberTrackDistances = (
  stations: readonly StationWithTrackDistance[]
): void => {
  for (let i = 1; i < stations.length; i++) {
    const prev = stations[i - 1];
    const cur = stations[i];
    if (prev.id == null || cur.id == null) {
      continue;
    }
    const key = pairKey(prev.id, cur.id);
    const meters = cur.trackDistanceFromPrevious;
    // 線路の長さが無いと返ってきた組は、前に覚えた値を消して直線距離で代えさせる
    // (データの更新で値が無くなった組を、古い値のまま track として記録しないため)
    if (meters == null) {
      distances.delete(key);
      continue;
    }
    distances.set(key, meters);
  }
};

// 線路の長さを返す問い合わせ。ほかの問い合わせは trackDistanceFromPrevious を返さない。
// stations(ids) は sids のディープリンクが経路の駅を順に渡す。ids の並びで隣り合って
// いても線路のデータ上で隣り合わない組は null が返るが、その組は lineStations などでも
// 値が入らないため、覚えた値を消すことはない
const TRACK_DISTANCE_FIELDS = [
  'lineStations',
  'lineGroupStations',
  'stations',
] as const;

/**
 * GraphQL の応答から、線路の長さを返す問い合わせの結果を探して覚える。
 * gqlRequest がすべての応答について呼ぶ。
 */
export const rememberTrackDistancesFromResponse = (data: unknown): void => {
  if (data == null || typeof data !== 'object') {
    return;
  }
  for (const field of TRACK_DISTANCE_FIELDS) {
    const stations = (data as Record<string, unknown>)[field];
    if (Array.isArray(stations)) {
      rememberTrackDistances(stations as StationWithTrackDistance[]);
    }
  }
};

/**
 * 隣り合う2駅のあいだの線路の長さ(m)。覚えていなければ null。
 */
export const getTrackDistance = (a: number, b: number): number | null =>
  distances.get(pairKey(a, b)) ?? null;

// テスト専用
export const resetTrackDistancesForTesting = (): void => {
  distances.clear();
};
