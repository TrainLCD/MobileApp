import type { RideSessionWithStops, RideStopRecord } from '~/lib/rideLog';
import { summarizeRidePrefectures } from './ridePrefectures';

const range = { start: new Date(0), end: new Date(100 * 60 * 60 * 1000) };
const MINUTE = 60 * 1000;

type StopInput = {
  prefectureId: number | null;
  kind?: 'arrived' | 'passed';
  meters?: number;
};

const ride = (
  id: string,
  startedAt: number,
  inputs: StopInput[]
): RideSessionWithStops => {
  const stops: RideStopRecord[] = inputs.map((input, seq) => ({
    seq,
    stationId: seq + 1,
    stationGroupId: null,
    stationName: null,
    lineId: 11,
    lineName: '中央線快速',
    lineColor: '#F15A22',
    kind: input.kind ?? 'arrived',
    arrivedAt: seq === 0 ? null : startedAt + seq * MINUTE,
    departedAt: seq === 0 ? startedAt : null,
    distanceFromPrevious: seq === 0 ? 0 : (input.meters ?? 1000),
    distanceSource: 'haversine',
    latitude: null,
    longitude: null,
    pathFromPrevious: null,
    prefectureId: input.prefectureId,
  }));
  return {
    id,
    startedAt,
    endedAt: startedAt + inputs.length * MINUTE,
    lineId: 11,
    lineName: '中央線快速',
    lineColor: '#F15A22',
    trainTypeId: null,
    direction: 'INBOUND',
    stops,
  };
};

describe('summarizeRidePrefectures', () => {
  it('到着した駅(出発駅を含む)の都道府県を数え、距離は到着した側の駅の都道府県に数える', () => {
    const result = summarizeRidePrefectures(
      [
        ride('r1', 0, [
          { prefectureId: 13 },
          { prefectureId: 13, meters: 2000 },
          { prefectureId: 14, meters: 5000 },
        ]),
      ],
      range
    );
    expect(result.prefectures).toEqual([
      { prefectureId: 14, distanceMeters: 5000 },
      { prefectureId: 13, distanceMeters: 2000 },
    ]);
    expect(result.unrecordedRideCount).toBe(0);
  });

  it('出発駅だけがある都道府県も、距離0で数える', () => {
    const result = summarizeRidePrefectures(
      [ride('r1', 0, [{ prefectureId: 11 }, { prefectureId: 13 }])],
      range
    );
    expect(result.prefectures).toEqual([
      { prefectureId: 13, distanceMeters: 1000 },
      { prefectureId: 11, distanceMeters: 0 },
    ]);
  });

  it('通過しただけの都道府県は出さず、そこに着いた都道府県の距離は通過駅の分も数える', () => {
    const result = summarizeRidePrefectures(
      [
        ride('r1', 0, [
          { prefectureId: 13 },
          { prefectureId: 19, kind: 'passed', meters: 3000 },
          { prefectureId: 13, kind: 'passed', meters: 500 },
          { prefectureId: 13, meters: 1000 },
        ]),
      ],
      range
    );
    expect(result.prefectures).toEqual([
      { prefectureId: 13, distanceMeters: 1500 },
    ]);
  });

  it('期間内の乗車の距離を都道府県ごとに足し合わせる', () => {
    const result = summarizeRidePrefectures(
      [
        ride('r1', 0, [{ prefectureId: 13 }, { prefectureId: 13 }]),
        ride('r2', 60 * MINUTE, [{ prefectureId: 13 }, { prefectureId: 13 }]),
      ],
      range
    );
    expect(result.prefectures).toEqual([
      { prefectureId: 13, distanceMeters: 2000 },
    ]);
  });

  it('都道府県を記録する前の乗車は数えず、その回数を返す', () => {
    const result = summarizeRidePrefectures(
      [
        ride('r1', 0, [{ prefectureId: 13 }, { prefectureId: 13 }]),
        ride('old', 60 * MINUTE, [
          { prefectureId: null },
          { prefectureId: null },
        ]),
      ],
      range
    );
    expect(result.prefectures).toHaveLength(1);
    expect(result.unrecordedRideCount).toBe(1);
  });

  it('集計に数えない乗車と、期間の外に乗りはじめた乗車は数えない', () => {
    const result = summarizeRidePrefectures(
      [
        // 出発駅の次の駅に到着していない
        ride('passing', 0, [
          { prefectureId: 13 },
          { prefectureId: 13, kind: 'passed' },
        ]),
        ride('outside', range.end.getTime(), [
          { prefectureId: 13 },
          { prefectureId: 13 },
        ]),
        ride('old-passing', 0, [
          { prefectureId: null },
          { prefectureId: null, kind: 'passed' },
        ]),
      ],
      range
    );
    expect(result).toEqual({ prefectures: [], unrecordedRideCount: 0 });
  });

  it('同じ距離なら prefectureId の小さい順に並べる', () => {
    const result = summarizeRidePrefectures(
      [
        ride('r1', 0, [{ prefectureId: 14 }, { prefectureId: 14 }]),
        ride('r2', 60 * MINUTE, [{ prefectureId: 13 }, { prefectureId: 13 }]),
      ],
      range
    );
    expect(result.prefectures.map((p) => p.prefectureId)).toEqual([13, 14]);
  });
});
