import type {
  RideCoordinate,
  RideSessionWithStops,
  RideStopRecord,
} from '~/lib/rideLog';
import {
  buildRideRoutes,
  getRideRouteRegion,
  RIDE_ROUTE_LEVELS,
} from './rideRoutes';
import { MAX_STOP_GAP_MS } from './rideStats';

const range = { start: new Date(0), end: new Date(100 * 60 * 60 * 1000) };
const MINUTE = 60 * 1000;

// 経度方向に並ぶ駅 A〜E の座標
const A = { latitude: 35.68, longitude: 139.7 };
const B = { latitude: 35.68, longitude: 139.71 };
const C = { latitude: 35.68, longitude: 139.72 };
const D = { latitude: 35.68, longitude: 139.73 };
const E = { latitude: 35.68, longitude: 139.74 };

type StopInput = {
  at: RideCoordinate | null;
  name?: string;
  path?: RideCoordinate[] | null;
  color?: string;
  minutes?: number;
  kind?: 'arrived' | 'passed';
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
    stationName: input.name ?? null,
    lineId: 11,
    lineName: '中央線快速',
    lineColor: input.color ?? '#F15A22',
    kind: input.kind ?? 'arrived',
    arrivedAt: seq === 0 ? null : startedAt + (input.minutes ?? seq) * MINUTE,
    departedAt: seq === 0 ? startedAt : null,
    distanceFromPrevious: seq === 0 ? 0 : 1000,
    distanceSource: 'haversine',
    latitude: input.at?.latitude ?? null,
    longitude: input.at?.longitude ?? null,
    pathFromPrevious: input.at ? (input.path ?? []) : null,
    prefectureId: null,
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

describe('buildRideRoutes', () => {
  it('検出した駅のあいだを、記録時にたどった駅で埋めて1本の線にする', () => {
    const routes = buildRideRoutes(
      [
        ride('r1', 0, [
          { at: A, name: 'A' },
          { at: D, name: 'D', path: [B, C] },
        ]),
      ],
      range
    );
    expect(routes.lines).toEqual([
      { coordinates: [A, B, C, D], color: '#F15A22', level: 1 },
    ]);
    expect(routes.unmappedRideCount).toBe(0);
  });

  it('よく乗った区間ほど太さの段階を上げ、段階の変わり目で線を分ける', () => {
    const routes = buildRideRoutes(
      [
        ride('r1', 0, [{ at: A }, { at: B }, { at: C }]),
        ride('r2', 60 * MINUTE, [{ at: A }, { at: B }]),
      ],
      range
    );
    expect(routes.lines).toEqual([
      { coordinates: [A, B], color: '#F15A22', level: RIDE_ROUTE_LEVELS },
      { coordinates: [B, C], color: '#F15A22', level: 1 },
    ]);
  });

  it('逆向きに乗った区間も同じ区間として数え、2度は描かない', () => {
    const routes = buildRideRoutes(
      [
        ride('r1', 0, [{ at: A }, { at: B }]),
        ride('r2', 60 * MINUTE, [{ at: B }, { at: A }]),
      ],
      range
    );
    // 2回乗った区間なので、期間でいちばん多い回数として最も太い段階になる
    expect(routes.lines).toEqual([
      { coordinates: [A, B], color: '#F15A22', level: RIDE_ROUTE_LEVELS },
    ]);
  });

  it('駅間は到着した側の駅の路線色で描き、直通運転で色が変わるところで線を分ける', () => {
    const routes = buildRideRoutes(
      [
        ride('r1', 0, [
          { at: A },
          { at: B },
          { at: C, color: '#0079C2' },
          { at: D, color: '#0079C2' },
        ]),
      ],
      range
    );
    expect(routes.lines).toEqual([
      { coordinates: [A, B], color: '#F15A22', level: 1 },
      { coordinates: [B, C, D], color: '#0079C2', level: 1 },
    ]);
  });

  it('駅の座標を保存する前の乗車は描かず、その数を返す', () => {
    const old = ride('old', 60 * MINUTE, [{ at: null }, { at: null }]);
    const routes = buildRideRoutes(
      [
        ride('r1', 0, [{ at: A }, { at: B }]),
        {
          ...old,
          stops: old.stops.map((stop) => ({ ...stop, lineId: 22 })),
        },
      ],
      range
    );
    expect(routes.lines).toHaveLength(1);
    expect(routes.unmappedRideCount).toBe(1);
    // 描いていない乗車の路線は、描いた路線に入れない
    expect(routes.lineIds).toEqual([11]);
  });

  it('集計に数えない乗車と、期間の外に乗りはじめた乗車は描かない', () => {
    const routes = buildRideRoutes(
      [
        // 出発駅の次の駅に到着していない
        ride('passing', 0, [{ at: A }, { at: B, kind: 'passed' }]),
        ride('outside', range.end.getTime(), [{ at: A }, { at: B }]),
        // 座標が無くても、集計に数えない乗車は地図に出ない回数にも入れない
        ride('old-passing', 0, [{ at: null }, { at: null, kind: 'passed' }]),
      ],
      range
    );
    expect(routes.lines).toEqual([]);
    expect(routes.unmappedRideCount).toBe(0);
    expect(routes.bounds).toBeNull();
  });

  it('駅の検出が長く途切れたら、集計と同じくその手前までを描く', () => {
    const gapMinutes = MAX_STOP_GAP_MS / MINUTE + 10;
    const routes = buildRideRoutes(
      [
        ride('r1', 0, [
          { at: A },
          { at: B, minutes: 1 },
          { at: C, minutes: gapMinutes },
        ]),
      ],
      range
    );
    expect(routes.lines).toEqual([
      { coordinates: [A, B], color: '#F15A22', level: 1 },
    ]);
  });

  it('描いた駅を返し、線の端の駅と検出した駅の名前が分かる', () => {
    const routes = buildRideRoutes(
      [
        ride('r1', 0, [
          { at: A, name: '三鷹' },
          { at: C, name: '荻窪', path: [B] },
          { at: E, name: '新宿', path: [D] },
        ]),
      ],
      range
    );
    expect(
      routes.stations.map((s) => [s.longitude, s.name, s.isTerminal])
    ).toEqual([
      [139.7, '三鷹', true],
      [139.71, null, false],
      [139.72, '荻窪', false],
      [139.73, null, false],
      [139.74, '新宿', true],
    ]);
    expect(routes.bounds).toEqual({
      minLatitude: 35.68,
      maxLatitude: 35.68,
      minLongitude: 139.7,
      maxLongitude: 139.74,
    });
  });
});

describe('getRideRouteRegion', () => {
  it('経路の中心に、余白を足した幅で表示する。狭すぎる幅は広げる', () => {
    const region = getRideRouteRegion({
      minLatitude: 35.68,
      maxLatitude: 35.68,
      minLongitude: 139.7,
      maxLongitude: 139.8,
    });
    expect(region.latitude).toBeCloseTo(35.68);
    expect(region.longitude).toBeCloseTo(139.75);
    expect(region.longitudeDelta).toBeCloseTo(0.13);
    expect(region.latitudeDelta).toBeCloseTo(0.02);
  });
});
