import type { RideSessionWithStops, RideStopRecord } from '~/lib/rideLog';
import {
  getRidePeriodRange,
  MAX_STOP_GAP_MS,
  measureRide,
  summarizeRides,
} from './rideStats';

// npm test は TZ=UTC で動くため、ローカル時刻 = UTC として日時を組み立てる
const at = (iso: string) => new Date(iso).getTime();
const MIN = 60 * 1000;

const stop = (
  seq: number,
  overrides: Partial<RideStopRecord> = {}
): RideStopRecord => ({
  seq,
  stationId: 100 + seq,
  stationGroupId: 200 + seq,
  stationName: `駅${seq}`,
  lineId: 11,
  lineName: '中央線快速',
  lineColor: '#F15A22',
  kind: 'arrived',
  arrivedAt: null,
  departedAt: null,
  distanceFromPrevious: 0,
  distanceSource: 'haversine',
  latitude: null,
  longitude: null,
  pathFromPrevious: null,
  prefectureId: null,
  ...overrides,
});

// 出発駅を startedAt に発車し、以降の駅に interval ごとに1000mずつ進む乗車
const ride = (
  id: string,
  startedAt: number,
  stops: Partial<RideStopRecord>[],
  interval = 3 * MIN
): RideSessionWithStops => ({
  id,
  startedAt,
  endedAt: startedAt,
  lineId: 11,
  lineName: '中央線快速',
  lineColor: '#F15A22',
  trainTypeId: null,
  direction: 'INBOUND',
  stops: [
    stop(0, { departedAt: startedAt }),
    ...stops.map((s, i) =>
      stop(i + 1, {
        arrivedAt: startedAt + interval * (i + 1),
        distanceFromPrevious: 1000,
        ...s,
      })
    ),
  ],
});

describe('getRidePeriodRange', () => {
  it('週は月曜日から日曜日までの7日間', () => {
    const range = getRidePeriodRange('week', new Date('2026-09-30T15:00:00Z'));
    expect(range.start.toISOString()).toBe('2026-09-28T00:00:00.000Z');
    expect(range.end.toISOString()).toBe('2026-10-05T00:00:00.000Z');
  });

  it('日曜日は前の月曜日から始まる週に入る', () => {
    const range = getRidePeriodRange('week', new Date('2026-10-04T23:59:59Z'));
    expect(range.start.toISOString()).toBe('2026-09-28T00:00:00.000Z');
  });

  it('月曜日の0時はその週の始まり', () => {
    const range = getRidePeriodRange('week', new Date('2026-09-28T00:00:00Z'));
    expect(range.start.toISOString()).toBe('2026-09-28T00:00:00.000Z');
  });

  it('月と年は暦どおりに区切る', () => {
    const now = new Date('2026-02-10T12:00:00Z');
    const month = getRidePeriodRange('month', now);
    expect(month.start.toISOString()).toBe('2026-02-01T00:00:00.000Z');
    expect(month.end.toISOString()).toBe('2026-03-01T00:00:00.000Z');
    const year = getRidePeriodRange('year', now);
    expect(year.start.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(year.end.toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });
});

describe('measureRide', () => {
  it('出発駅から最後の到着までの距離と時間を求める', () => {
    const start = at('2026-09-28T08:00:00Z');
    const result = measureRide(ride('r', start, [{}, {}, {}]));
    expect(result.distanceMeters).toBe(3000);
    expect(result.durationMs).toBe(9 * MIN);
  });

  it('最後の到着より後に通過だけを検出した駅は数えない', () => {
    const start = at('2026-09-28T08:00:00Z');
    const result = measureRide(
      ride('r', start, [{}, { kind: 'passed' }, {}, { kind: 'passed' }])
    );
    // 通過駅を挟んだ3駅目(到着)までの3区間
    expect(result.distanceMeters).toBe(3000);
    expect(result.durationMs).toBe(9 * MIN);
  });

  it('検出が長く途切れたら、その手前の到着で乗車が終わったとみなす', () => {
    const start = at('2026-09-28T08:00:00Z');
    const session = ride('r', start, [{}, {}]);
    session.stops.push(
      stop(3, {
        arrivedAt: start + 6 * MIN + MAX_STOP_GAP_MS + 1,
        distanceFromPrevious: 1000,
      })
    );
    const result = measureRide(session);
    expect(result.distanceMeters).toBe(2000);
    expect(result.durationMs).toBe(6 * MIN);
  });

  it('到着を1つも検出していない乗車は距離も時間も0', () => {
    const start = at('2026-09-28T08:00:00Z');
    const result = measureRide(ride('r', start, [{ kind: 'passed' }]));
    expect(result).toEqual({ distanceMeters: 0, durationMs: 0, stops: [] });
  });
});

describe('summarizeRides', () => {
  const week = getRidePeriodRange('week', new Date('2026-09-30T12:00:00Z'));

  it('期間に乗りはじめた乗車だけを合計する', () => {
    const stats = summarizeRides(
      [
        ride('before', at('2026-09-27T23:50:00Z'), [{}]),
        ride('mon', at('2026-09-28T08:00:00Z'), [{}, {}]),
        ride('sun', at('2026-10-04T22:00:00Z'), [{}]),
        ride('after', at('2026-10-05T00:00:00Z'), [{}]),
      ],
      'week',
      week
    );
    expect(stats.rideCount).toBe(2);
    expect(stats.distanceMeters).toBe(3000);
    expect(stats.durationMs).toBe(9 * MIN);
  });

  it('週は曜日ごとの7つに分け、月をまたいでも日付どおりに並べる', () => {
    const stats = summarizeRides(
      [
        ride('mon', at('2026-09-28T08:00:00Z'), [{}, {}]),
        ride('thu', at('2026-10-01T08:00:00Z'), [{}]),
      ],
      'week',
      week
    );
    expect(
      stats.buckets.map((b) => b.start.toISOString().slice(0, 10))
    ).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ]);
    expect(stats.buckets.map((b) => b.distanceMeters)).toEqual([
      2000, 0, 0, 1000, 0, 0, 0,
    ]);
  });

  it('日付をまたいだ乗車は乗りはじめた日に入れる', () => {
    const stats = summarizeRides(
      [ride('late', at('2026-09-28T23:55:00Z'), [{}, {}, {}])],
      'week',
      week
    );
    expect(stats.buckets[0].distanceMeters).toBe(3000);
    expect(stats.buckets[1].distanceMeters).toBe(0);
  });

  it('月は日ごと、年は月ごとに分ける', () => {
    const now = new Date('2026-02-10T12:00:00Z');
    const month = summarizeRides(
      [ride('r', at('2026-02-10T08:00:00Z'), [{}])],
      'month',
      getRidePeriodRange('month', now)
    );
    expect(month.buckets).toHaveLength(28);
    expect(month.buckets[9].distanceMeters).toBe(1000);

    const year = summarizeRides(
      [ride('r', at('2026-02-10T08:00:00Z'), [{}])],
      'year',
      getRidePeriodRange('year', now)
    );
    expect(year.buckets).toHaveLength(12);
    expect(year.buckets[1].distanceMeters).toBe(1000);
  });

  it('路線ごとの距離は到着した側の駅の路線に数え、同じ回数なら長い順に並べる', () => {
    const start = at('2026-09-28T08:00:00Z');
    // 中央線快速から総武線へ直通する乗車(中央線 1000m・総武線 2000m)
    const through = ride('through', start, [
      {},
      { lineId: 22, lineName: '総武線', lineColor: '#FFD400' },
      { lineId: 22, lineName: '総武線', lineColor: '#FFD400' },
    ]);
    const stats = summarizeRides([through], 'week', week);
    expect(
      stats.lines.map((l) => [l.lineId, l.distanceMeters, l.rideCount])
    ).toEqual([
      [22, 2000, 1],
      [11, 1000, 1],
    ]);
  });

  it('直通運転の接続駅を続けて記録していても、次の路線に乗ったとは数えない', () => {
    const start = at('2026-09-28T08:00:00Z');
    // 中央線快速で駅2(接続駅)に着き、同じ駅を総武線の駅としても記録した乗車
    const junction = ride('junction', start, [
      {},
      {},
      {
        stationId: 302,
        stationGroupId: 202,
        lineId: 22,
        lineName: '総武線',
        lineColor: '#FFD400',
        distanceFromPrevious: 30,
        pathFromPrevious: [],
      },
    ]);
    const stats = summarizeRides([junction], 'week', week);
    expect(
      stats.lines.map((l) => [l.lineId, l.distanceMeters, l.rideCount])
    ).toEqual([[11, 2000, 1]]);
  });

  it('あいだに駅を挟んで同じ駅に戻った駅間は、乗った駅間として数える', () => {
    const start = at('2026-09-28T08:00:00Z');
    // 都庁前(駅1)から新宿を取りこぼし、もう一方の都庁前に着いた乗車
    const loop = ride('loop', start, [
      {},
      {
        stationId: 301,
        stationGroupId: 201,
        distanceFromPrevious: 1600,
        pathFromPrevious: [{ latitude: 35.69, longitude: 139.7 }],
      },
    ]);
    const stats = summarizeRides([loop], 'week', week);
    expect(
      stats.lines.map((l) => [l.lineId, l.distanceMeters, l.rideCount])
    ).toEqual([[11, 2600, 1]]);
  });

  it('距離が短くても乗った回数の多い路線を先に並べる', () => {
    // 総武線を1回で5000m、中央線快速を2回で計2000m
    const sobu = ride(
      'sobu',
      at('2026-09-28T08:00:00Z'),
      Array.from({ length: 5 }, () => ({
        lineId: 22,
        lineName: '総武線',
        lineColor: '#FFD400',
      }))
    );
    const chuo1 = ride('chuo1', at('2026-09-29T08:00:00Z'), [{}]);
    const chuo2 = ride('chuo2', at('2026-09-30T08:00:00Z'), [{}]);
    const stats = summarizeRides([sobu, chuo1, chuo2], 'week', week);
    expect(
      stats.lines.map((l) => [l.lineId, l.distanceMeters, l.rideCount])
    ).toEqual([
      [11, 2000, 2],
      [22, 5000, 1],
    ]);
  });
});
