import type { LocationObject } from 'expo-location';
import { StopCondition } from '~/@types/graphql';
import {
  createServicePatternDetector,
  type PatternStation,
} from './servicePatternMismatch';

const latitudeAt = (meters: number) => 35 + meters / 111_320;

const stop = (
  groupId: number,
  meters: number,
  stopCondition = StopCondition.All
): PatternStation => ({
  groupId,
  latitude: latitudeAt(meters),
  longitude: 139,
  name: `停車地点${groupId}`,
  nameRoman: `Stop ${groupId}`,
  stopCondition,
});

const fix = (
  meters: number,
  timestamp: number,
  speed: number,
  accuracy = 10
): LocationObject => ({
  timestamp,
  coords: {
    latitude: latitudeAt(meters),
    longitude: 139,
    speed,
    accuracy,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
  },
});

const play = (
  observe: ReturnType<typeof createServicePatternDetector>,
  samples: LocationObject[]
) => samples.map((sample) => observe(sample, sample.timestamp));

describe('列車種別の違い', () => {
  const middle = stop(2, 0);
  const local = [stop(1, -500), middle, stop(3, 500)];
  const moving = [fix(-75, 1000, 15), fix(75, 11000, 15)];

  it('停車予定の駅を走行方向に減速せず通過すると検知する', () => {
    expect(play(createServicePatternDetector(local, null), moving)).toEqual([
      undefined,
      { kind: 'rail-pass', station: middle },
    ]);
  });

  it('高頻度測位でも誤差より十分広い範囲を観測して通過を検知する', () => {
    const frequent = Array.from({ length: 11 }, (_, i) =>
      fix(-75 + 15 * i, 1000 + 1000 * i, 15)
    );
    expect(
      play(createServicePatternDetector(local, null), frequent)
    ).toContainEqual({
      kind: 'rail-pass',
      station: middle,
    });
  });

  it.each([
    ['逆方向', [fix(75, 1000, 15), fix(-75, 11000, 15)]],
    ['長い測位間隔', [fix(-75, 1000, 15), fix(75, 19000, 15)]],
    ['精度の低い測位', [fix(-75, 1000, 15, 60), fix(75, 11000, 15)]],
    ['測位間に減速', [fix(-75, 1000, 15), fix(0, 6000, 1), fix(75, 11000, 15)]],
    ['駅の手前までの接近', [fix(-150, 1000, 15), fix(-1, 11000, 15)]],
  ] as const)('%sでは通過を確定しない', (_label, samples) => {
    expect(
      play(createServicePatternDetector(local, null), [...samples]).every(
        (event) => event === undefined
      )
    ).toBe(true);
  });

  it.each([
    StopCondition.Not,
    StopCondition.Partial,
    StopCondition.PartialStop,
  ])('%s の駅を通過しても警告しない', (condition) => {
    const stations = [local[0], stop(2, 0, condition), local[2]];
    expect(play(createServicePatternDetector(stations, null), moving)).toEqual([
      undefined,
      undefined,
    ]);
  });

  it('同じ通過駅での停車は1駅と数え、別の通過駅で停車してから警告する', () => {
    const first = stop(2, 0, StopCondition.Not);
    const second = stop(3, 500, StopCondition.Not);
    const observe = createServicePatternDetector(
      [local[0], first, second, stop(4, 1000)],
      null
    );
    expect(
      play(observe, [
        fix(-100, 1000, 10),
        fix(0, 11000, 0),
        fix(2, 21000, 0),
        fix(1, 31000, 0),
      ])
    ).toEqual([undefined, undefined, undefined, undefined]);
    expect(
      play(observe, [
        fix(400, 41000, 10),
        fix(500, 51000, 0),
        fix(501, 61000, 0),
      ])
    ).toEqual([undefined, undefined, { kind: 'rail-stop', station: second }]);
  });
});

describe('バスの運行パターンの違い', () => {
  const selected = [stop(1, -500), stop(4, 1000), stop(5, 1500)];
  const first = stop(2, 0);
  const second = stop(3, 500);
  const lineStops = [selected[0], first, second, selected[1], selected[2]];

  it('選択中のパターンにない停留所での停車を2箇所確認して警告する', () => {
    const observe = createServicePatternDetector(selected, lineStops);
    expect(
      play(observe, [
        fix(-100, 1000, 10),
        fix(0, 11000, 0),
        fix(1, 21000, 0),
        fix(400, 31000, 10),
        fix(500, 41000, 0),
        fix(501, 51000, 0),
      ])
    ).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { kind: 'bus-stop', station: second },
    ]);
  });

  it('乗降なしの通過を種別違いと判定しない', () => {
    const observe = createServicePatternDetector(selected, lineStops);
    expect(play(observe, [fix(925, 1000, 15), fix(1075, 11000, 15)])).toEqual([
      undefined,
      undefined,
    ]);
  });

  it('乗車前や動き出す前の静止は停車の証拠にしない', () => {
    const observe = createServicePatternDetector(selected, lineStops);
    expect(
      play(observe, [
        fix(0, 1000, 0),
        fix(1, 11000, 0),
        fix(400, 21000, 10),
        fix(500, 31000, 0),
        fix(501, 41000, 0),
      ])
    ).toEqual(Array(5).fill(undefined));
  });
});
