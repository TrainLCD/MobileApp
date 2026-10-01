import {
  cruiseSpeedForDuration,
  planLegTimings,
  speedProfileForDuration,
  toStopTiming,
} from './trainRouteTiming';

const trapezoidSeconds = (
  distance: number,
  v: number,
  a: number,
  b: number
) => {
  const k = 0.5 / a + 0.5 / b;
  return distance >= v * v * k
    ? distance / v + v * k
    : 2 * Math.sqrt(distance * k);
};

const at = (arrivalMin: number, departureMin: number) => ({
  arrivalSec: arrivalMin * 60,
  departureSec: departureMin * 60,
});

describe('cruiseSpeedForDuration', () => {
  it('台形で走ったときに求めた時間になる速度を返す', () => {
    for (const [distance, seconds] of [
      [4843, 300],
      [1627, 150],
      [300, 60],
    ]) {
      const fitted = cruiseSpeedForDuration(distance, seconds, 0.7, 0.9);
      expect(fitted?.shortened).toBe(false);
      expect(
        trapezoidSeconds(distance, fitted?.speed ?? 0, 0.7, 0.9)
      ).toBeCloseTo(seconds, 6);
    }
  });

  it('最短時間より短い時間なら最短時間で走る速度にする', () => {
    const k = 0.5 / 0.7 + 0.5 / 0.9;
    const fitted = cruiseSpeedForDuration(2000, 10, 0.7, 0.9);
    expect(fitted?.shortened).toBe(true);
    expect(fitted?.speed).toBeCloseTo(Math.sqrt(2000 / k), 9);
  });

  it('距離と加減速が正でなければ決められない', () => {
    expect(cruiseSpeedForDuration(0, 60, 0.7, 0.9)).toBeNull();
    expect(cruiseSpeedForDuration(1000, 60, 0, 0.9)).toBeNull();
  });
});

describe('planLegTimings', () => {
  it('区間の時間は、次の停車駅の到着とこの駅の出発の差', () => {
    expect(planLegTimings([at(0, 0), at(2, 2.6), at(5, 5)], [0, 1, 2])).toEqual(
      [
        { runSec: 120, dwellSec: 36 },
        { runSec: 144, dwellSec: 0 },
      ]
    );
  });

  it('呼び出し側で通過する駅に推定だけが停まるときは、その停車時間を走行から引く', () => {
    expect(planLegTimings([at(0, 0), at(2, 2.6), at(5, 5)], [0, 2])).toEqual([
      { runSec: 264, dwellSec: 0 },
    ]);
  });

  it('呼び出し側で停まる駅を推定が通過していたら、停車時間は null', () => {
    expect(planLegTimings([at(0, 0), at(2, 2), at(5, 5)], [0, 1, 2])).toEqual([
      { runSec: 120, dwellSec: null },
      { runSec: 180, dwellSec: 0 },
    ]);
    expect(
      planLegTimings([at(0, 0), at(2, 2), at(5, 5)], [0, 1, 2], 30)
    ).toEqual([
      { runSec: 120, dwellSec: 30 },
      { runSec: 180, dwellSec: 0 },
    ]);
  });

  it('見込みの無い駅があれば null', () => {
    expect(planLegTimings([at(0, 0), null], [0, 1])).toBeNull();
  });
});

describe('toStopTiming', () => {
  it('累積分を秒にし、どちらかが無ければ null', () => {
    expect(
      toStopTiming({
        arrivalCumulativeMinutes: 1.5,
        departureCumulativeMinutes: 2,
      })
    ).toEqual({ arrivalSec: 90, departureSec: 120 });
    expect(
      toStopTiming({
        arrivalCumulativeMinutes: 1.5,
        departureCumulativeMinutes: null,
      })
    ).toBeNull();
    expect(toStopTiming(null)).toBeNull();
  });
});

describe('speedProfileForDuration', () => {
  it('走り切れる時間なら、速度列の長さを求めた秒数に合わせ、距離も走り切る', () => {
    for (const [distance, accel, decel] of [
      [800, 1.0, 1.0],
      [2100, 0.7, 0.9],
      [5000, 0.7, 0.9],
      [30000, 0.4, 0.7],
    ]) {
      const k = 0.5 / accel + 0.5 / decel;
      const fastest = Math.ceil(2 * Math.sqrt(distance * k));
      for (const extra of [3, 10, 37, 120]) {
        const seconds = fastest + extra;
        const result = speedProfileForDuration({
          distance,
          seconds,
          accel,
          decel,
        });
        expect(result?.shortened).toBe(false);
        expect(result?.profile).toHaveLength(seconds);
        const total = (result?.profile ?? []).reduce((sum, v) => sum + v, 0);
        expect(total).toBeCloseTo(distance, 6);
      }
    }
  });

  it('最短時間より短い時間なら最短の列を返して shortened を立てる', () => {
    const result = speedProfileForDuration({
      distance: 2000,
      seconds: 10,
      accel: 0.7,
      decel: 0.9,
    });
    expect(result?.shortened).toBe(true);
    expect(result?.profile.length).toBeGreaterThan(10);
  });
});
