import { toRelativeEtaStops } from './relativeEtaStops';

const stop = (
  stationId: number | null,
  cumulativeMinutes: number | null,
  departureCumulativeMinutes: number | null = cumulativeMinutes
) => ({ stationId, cumulativeMinutes, departureCumulativeMinutes });

describe('toRelativeEtaStops', () => {
  it('現在駅の出発時刻を基準(0分)とした相対値に変換する', () => {
    const stops = [stop(1, 0), stop(2, 5, 6), stop(3, 12), stop(4, 20)];

    expect(toRelativeEtaStops(stops, 2)).toEqual([
      expect.objectContaining({ stationId: 3, cumulativeMinutes: 6 }),
      expect.objectContaining({ stationId: 4, cumulativeMinutes: 14 }),
    ]);
  });

  it('現在駅自身とそれより前の駅を除外する', () => {
    const stops = [stop(1, 0), stop(2, 5), stop(3, 12)];

    expect(toRelativeEtaStops(stops, 2).map((s) => s.stationId)).toEqual([3]);
  });

  it('現在駅の出発時刻が欠けて基準が0に落ちても、現在駅自身にはETAを付けない', () => {
    // 基準が 0 にフォールバックすると現在駅の相対値は生の値のまま正になり、
    // 相対値のフィルタだけでは残ってしまう。station id で明示的に除いて
    // 「停車中の駅には ETA を出さない」不変条件を計算結果に依存せず保つ。
    const stops = [stop(1, 0), stop(2, 5, null), stop(3, 12)];

    expect(
      toRelativeEtaStops(stops, 2).map((s) => [
        s.stationId,
        s.cumulativeMinutes,
      ])
    ).toEqual([[3, 12]]);
  });

  it('区間内に現在駅が見つからないときは基準を0として扱う', () => {
    const stops = [stop(1, 0), stop(2, 5), stop(3, 12)];

    expect(
      toRelativeEtaStops(stops, 99).map((s) => [
        s.stationId,
        s.cumulativeMinutes,
      ])
    ).toEqual([
      [2, 5],
      [3, 12],
    ]);
  });

  it('現在駅が未確定のときは id 無しの stop を基準に取らない', () => {
    // currentStationId が undefined だと stationId 未設定の stop と
    // undefined 同士で一致してしまい、無関係な出発時刻が基準に入る。
    const stops = [
      {
        stationId: undefined,
        cumulativeMinutes: 4,
        departureCumulativeMinutes: 30,
      },
      stop(2, 5),
      stop(3, 12),
    ];

    expect(
      toRelativeEtaStops(stops, undefined).map((s) => [
        s.stationId,
        s.cumulativeMinutes,
      ])
    ).toEqual([
      [2, 5],
      [3, 12],
    ]);
  });

  it('stationId が無い stop は除外する', () => {
    const stops = [stop(null, 5), stop(3, 12)];

    expect(toRelativeEtaStops(stops, 1).map((s) => s.stationId)).toEqual([3]);
  });

  it('cumulativeMinutes が null の stop は相対値を持たないまま残す', () => {
    const stops = [stop(2, 5), stop(3, null, 12)];

    expect(toRelativeEtaStops(stops, 2)).toEqual([
      expect.objectContaining({ stationId: 3, cumulativeMinutes: null }),
    ]);
  });

  it('元の stop の他のフィールドを保つ', () => {
    const stops = [
      { ...stop(2, 5), stopsHere: true },
      { ...stop(3, 12), stopsHere: false },
    ];

    expect(toRelativeEtaStops(stops, 2)[0]).toEqual({
      stationId: 3,
      cumulativeMinutes: 7,
      departureCumulativeMinutes: 12,
      stopsHere: false,
    });
  });
});
