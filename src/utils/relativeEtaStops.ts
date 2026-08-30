/** estimateArrivalTimes の stop のうち、相対時間への変換に必要な部分だけ。 */
export type EtaStopLike = {
  stationId?: number | null;
  cumulativeMinutes?: number | null;
  departureCumulativeMinutes?: number | null;
};

/**
 * 絶対累積分を持つ stops を、現在駅の出発時刻を基準(0分)とした相対時間に変換する。
 *
 * 表示側で絞り込む前の全 stops を渡す。基準となる現在駅の出発時刻は絞り込みの
 * 有無に依らず全 stops から引く必要があるため、絞り込みは呼び出し側でこの関数の
 * 後に行う(先に絞ると区間外に出た現在駅を見失って基準が 0 にフォールバックする)。
 *
 * 除外する stop は2種類:
 * - 現在駅自身。相対値は通常 0 以下になり下の条件で落ちるが、区間内に現在駅の
 *   エントリが見つからず基準が 0 にフォールバックしたときは生の値が残ってしまう。
 *   「停車中の駅には ETA を出さない」という表示上の不変条件を計算結果に依存せず
 *   保証するため、station id で明示的に除く。
 * - 相対値が 0 以下になった stop(= すでに通り過ぎた駅)。
 */
export const toRelativeEtaStops = <T extends EtaStopLike>(
  stops: readonly T[],
  currentStationId: number | null | undefined
): (T & { cumulativeMinutes: number | null })[] => {
  // 環状区間(6の字運転)では同じ駅が全stops中に複数回出現する。ただしこれらは
  // stationGroupId(同一駅を束ねる論理グループ)こそ共通だが、stationId は出現ごとに
  // 別々に採番されている(例: 都営大江戸線 都庁前の外回り/内回りはそれぞれ別の
  // stationId を持つ)。そのため stationGroupId で突き合わせると無関係な出現まで
  // 拾ってしまうが、stationId なら出現ごとに一意なので誤って混同することがない。
  // 現在駅が分からないときは探しに行かない。id 無しの stop は stationId が
  // undefined になりうるので、undefined 同士で一致してしまい、無関係な stop の
  // 出発時刻を基準に据えてしまう。
  const baseMinutes =
    currentStationId == null
      ? 0
      : (stops.find((s) => s.stationId === currentStationId)
          ?.departureCumulativeMinutes ?? 0);

  return stops
    .filter((s) => s.stationId != null && s.stationId !== currentStationId)
    .map((s) => ({
      ...s,
      cumulativeMinutes:
        s.cumulativeMinutes == null ? null : s.cumulativeMinutes - baseMinutes,
    }))
    .filter((s) => s.cumulativeMinutes == null || s.cumulativeMinutes > 0);
};
