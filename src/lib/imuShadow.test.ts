import {
  buildLeg,
  findImuOriginIndex,
  getMotionSampleTimeMs,
  horizontalAcceleration,
  ImuShadowEstimator,
  type Leg,
  type MotionSample,
} from './imuShadow';

const sample = (timeMs: number, x = 0, rotation = 0): MotionSample => ({
  timeMs,
  acceleration: { x, y: 0, z: 0 },
  accelerationIncludingGravity: { x, y: 0, z: 9.81 },
  rotationDegPerSecond: rotation,
});
const leg = (distanceM: number | null, etaSeconds = 40): Leg => ({
  fromId: 1,
  toId: 3,
  distanceM,
  etaSeconds,
  missingPairs: distanceM == null ? [[1, 3]] : [],
});
const run = (estimator: ImuShadowEstimator, intervals: [number, number][]) => {
  let time = 0;
  estimator.step(sample(time));
  for (const [duration, acceleration] of intervals) {
    for (let n = 0; n < duration * 10; n += 1) {
      time += 100;
      estimator.step(sample(time, acceleration));
    }
  }
  return estimator.snapshot();
};

describe('IMU shadow route legs', () => {
  const stops = [
    { stationId: 1, stopsHere: true, departureCumulativeMinutes: 1 },
    { stationId: 2, stopsHere: false },
    { stationId: 3, stopsHere: true, cumulativeMinutes: 3 },
  ];
  const distance = (a: number, b: number) => {
    const key = [a, b].sort().join(':');
    return key === '1:2' ? 400 : key === '2:3' ? 600 : null;
  };
  test('adds the lengths across a passing station', () => {
    expect(buildLeg(stops, 0, distance)?.leg).toEqual({
      fromId: 1,
      toId: 3,
      distanceM: 1000,
      etaSeconds: 120,
      missingPairs: [],
    });
  });
  test('uses the reverse route and unordered distance pairs', () => {
    const reverse = [...stops].reverse();
    expect(buildLeg(reverse, 0, distance)?.leg.distanceM).toBe(1000);
    expect(buildLeg(reverse, 0, distance)?.leg.toId).toBe(1);
  });
  test('does not substitute a straight line or silently drop an unknown pair', () => {
    const result = buildLeg(stops, 0, (a) => (a === 1 ? 400 : null));
    expect(result?.leg.distanceM).toBeNull();
    expect(result?.leg.missingPairs).toEqual([[2, 3]]);
  });
  test('does not infer an ETA from invalid or missing times', () => {
    expect(
      buildLeg(
        stops.map((s) => ({ ...s, cumulativeMinutes: null })),
        0,
        distance
      )?.leg.etaSeconds
    ).toBeNull();
  });
  test('uses outgoing junction row for the distance and departure ETA', () => {
    const through = [
      {
        stationId: 10,
        stationGroupId: 100,
        stopsHere: true,
        departureCumulativeMinutes: 2,
      },
      {
        stationId: 20,
        stationGroupId: 100,
        stopsHere: true,
        departureCumulativeMinutes: 3,
      },
      { stationId: 21, stationGroupId: 101, stopsHere: false },
      {
        stationId: 22,
        stationGroupId: 102,
        stopsHere: true,
        cumulativeMinutes: 5,
      },
      {
        stationId: 32,
        stationGroupId: 102,
        stopsHere: true,
        departureCumulativeMinutes: 6,
      },
    ];
    const result = buildLeg(through, 0, (a, b) =>
      (a === 20 && b === 21) || (a === 21 && b === 22) ? 500 : null
    );
    expect(result?.nextIndex).toBe(3);
    expect(result?.leg).toEqual({
      fromId: 10,
      toId: 22,
      toAliases: [32],
      distanceM: 1000,
      etaSeconds: 120,
      missingPairs: [],
    });
  });
  test('returns null at the terminal', () => {
    expect(buildLeg(stops, 2, distance)).toBeNull();
  });
});

describe('IMU shadow estimator', () => {
  test('projects out vertical acceleration with a tilted device', () => {
    const projected = horizontalAcceleration({
      ...sample(0),
      acceleration: { x: 1, y: 2, z: 2 },
      accelerationIncludingGravity: {
        x: 1,
        y: 2 + 9.81 / Math.sqrt(2),
        z: 2 + 9.81 / Math.sqrt(2),
      },
    });
    expect(projected?.x).toBeCloseTo(1);
    expect(projected?.y).toBeCloseTo(0);
    expect(projected?.z).toBeCloseTo(0);
  });
  test('elapsed ETA alone does not move a stationary train', () => {
    const estimate = run(new ImuShadowEstimator(leg(400)), [[90, 0]]);
    expect(estimate.phase).toBe('waiting');
    expect(estimate.distanceM).toBe(0);
    expect(estimate.arrivalCandidate).toBe(false);
  });
  test('a short phone movement does not calibrate a departure', () => {
    const estimate = run(new ImuShadowEstimator(leg(400)), [
      [0.5, 1],
      [1, 0],
    ]);
    expect(estimate.phase).toBe('waiting');
  });
  test('phone rotation invalidates the estimate', () => {
    const estimator = new ImuShadowEstimator(leg(400));
    run(estimator, [[2, 0.9]]);
    const estimate = estimator.step(sample(2100, 0, 30));
    expect(estimate.reason).toBe('device-motion');
    expect(estimate.arrivalCandidate).toBe(false);
  });
  test('missing distance cannot create an arrival candidate', () => {
    const estimate = run(new ImuShadowEstimator(leg(null)), [
      [10, 1],
      [20, 0],
      [10, -1],
      [5, 0],
    ]);
    expect(estimate.phase).toBe('invalid');
    expect(estimate.arrivalCandidate).toBe(false);
  });
  test('a missing sample interval cannot be integrated as movement', () => {
    const estimator = new ImuShadowEstimator(leg(400));
    run(estimator, [[2, 1]]);
    expect(estimator.step(sample(5000, 1)).reason).toBe('sample-gap');
  });
  test('a signal stop well before the station is not an arrival', () => {
    const estimate = run(new ImuShadowEstimator(leg(600)), [
      [10, 1],
      [5, 0],
      [10, -1],
      [5, 0],
    ]);
    expect(estimate.phase).toBe('stopped');
    expect(estimate.arrivalCandidate).toBe(false);
  });
  test('a nominal acceleration/coast/brake sequence near the station gives a candidate', () => {
    const estimate = run(new ImuShadowEstimator(leg(300)), [
      [10, 1],
      [20, 0],
      [10, -1],
      [5, 0],
    ]);
    expect(estimate.phase).toBe('stopped');
    expect(estimate.imuDistanceM).toBeCloseTo(300, -1);
    expect(estimate.arrivalCandidate).toBe(true);
  });
  test('missing motion data fails closed', () => {
    const estimator = new ImuShadowEstimator(leg(400));
    run(estimator, [[2, 1]]);
    expect(estimator.step({ ...sample(2100), acceleration: null }).reason).toBe(
      'missing-motion'
    );
  });
});

describe('native IMU timestamps and receipt watchdog', () => {
  test('converts seconds to milliseconds and rejects absent or invalid native time', () => {
    expect(getMotionSampleTimeMs(1234.5)).toBe(1234500);
    expect(getMotionSampleTimeMs(0)).toBe(0);
    for (const time of [
      null,
      undefined,
      -1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.MAX_VALUE,
    ]) {
      expect(getMotionSampleTimeMs(time)).toBeNull();
    }
  });

  test('uses native intervals even when JS receives a batch at the same time', () => {
    const estimator = new ImuShadowEstimator(leg(400), 0);
    for (let n = 0; n <= 20; n += 1) {
      estimator.step(sample(100_000 + n * 100, 1), 2000);
    }
    expect(estimator.snapshotAtReceiptTime(2000).phase).toBe('accelerating');
    expect(estimator.snapshot().imuSpeedMps).toBeCloseTo(2);
  });

  test('a periodic timer before queued native callbacks hides stale output but preserves contiguous integration', () => {
    const estimator = new ImuShadowEstimator(leg(400), 0);
    for (let n = 0; n <= 20; n += 1) {
      estimator.step(sample(100_000 + n * 100, 1), n * 100);
    }
    expect(estimator.snapshotForPeriodicObservation(2700)).toMatchObject({
      phase: 'invalid',
      reason: 'sample-gap',
      arrivalCandidate: false,
    });
    for (let n = 21; n <= 27; n += 1) {
      estimator.step(sample(100_000 + n * 100, 1), 2700);
    }
    expect(estimator.snapshotForPeriodicObservation(2700).phase).toBe(
      'accelerating'
    );
    expect(estimator.snapshot().imuSpeedMps).toBeCloseTo(2.7);
  });

  test('a periodic timer before the initial native callbacks allows contiguous integration', () => {
    const estimator = new ImuShadowEstimator(leg(400), 0);
    expect(estimator.snapshotForPeriodicObservation(1000)).toMatchObject({
      phase: 'invalid',
      reason: 'sample-gap',
      arrivalCandidate: false,
    });
    for (let n = 0; n <= 20; n += 1) {
      estimator.step(sample(100_000 + n * 100, 1), 1000);
    }
    expect(estimator.snapshotForPeriodicObservation(1000).phase).toBe(
      'accelerating'
    );
    expect(estimator.snapshot().imuSpeedMps).toBeCloseTo(2);
  });

  test('periodic observation permanently invalidates a continued absence of initial samples', () => {
    const estimator = new ImuShadowEstimator(leg(400), 0);
    expect(estimator.snapshotForPeriodicObservation(1000)).toMatchObject({
      phase: 'invalid',
      reason: 'sample-gap',
      arrivalCandidate: false,
    });
    expect(estimator.snapshotForPeriodicObservation(2000).reason).toBe(
      'sample-gap'
    );
    expect(estimator.step(sample(100_000), 2100).phase).toBe('invalid');
  });

  test('periodic observation permanently invalidates an outage that persists, including duplicate timestamps', () => {
    const estimator = new ImuShadowEstimator(leg(400), 0);
    estimator.step(sample(100_000), 100);
    expect(estimator.snapshotForPeriodicObservation(700).phase).toBe('invalid');
    estimator.step(sample(100_000), 900);
    expect(estimator.snapshotForPeriodicObservation(1700).reason).toBe(
      'sample-gap'
    );
    expect(estimator.step(sample(100_100), 1800).phase).toBe('invalid');
  });

  test('periodic observation cannot recover across a real native sample gap', () => {
    const estimator = new ImuShadowEstimator(leg(400), 0);
    estimator.step(sample(100_000), 100);
    expect(estimator.snapshotForPeriodicObservation(700).phase).toBe('invalid');
    expect(estimator.step(sample(100_700), 700).reason).toBe('sample-gap');
  });

  test('invalidates without another sample and ignores repeated native timestamps', () => {
    const estimator = new ImuShadowEstimator(leg(400), 1000);
    estimator.step(sample(100_000), 1100);
    estimator.step(sample(100_000), 1550);
    expect(estimator.snapshotAtReceiptTime(1600).phase).toBe('waiting');
    expect(estimator.snapshotAtReceiptTime(1601).reason).toBe('sample-gap');
    expect(estimator.step(sample(100_100), 1700).phase).toBe('invalid');
  });

  test('detects no initial sample and preserves the original invalidation reason', () => {
    const estimator = new ImuShadowEstimator(leg(400), 0);
    expect(estimator.snapshotAtReceiptTime(501).reason).toBe('sample-gap');
    const missing = new ImuShadowEstimator(leg(null), 0);
    expect(missing.snapshotAtReceiptTime(501).reason).toBe('missing-distance');
  });

  test('a sensor outage revokes an already published arrival candidate', () => {
    const estimator = new ImuShadowEstimator(leg(300));
    expect(
      run(estimator, [
        [10, 1],
        [20, 0],
        [10, -1],
        [5, 0],
      ]).arrivalCandidate
    ).toBe(true);
    estimator.step(sample(45_100), 5000);
    expect(estimator.snapshotAtReceiptTime(5500).arrivalCandidate).toBe(true);
    expect(estimator.snapshotAtReceiptTime(5501)).toMatchObject({
      phase: 'invalid',
      reason: 'sample-gap',
      arrivalCandidate: false,
    });
  });
});

it('resolves origin aliases within a junction and rejects ambiguous visits', () => {
  const stop = (stationId: number, stationGroupId: number) => ({
    stationId,
    stationGroupId,
    stopsHere: true,
  });
  const junction = [stop(1, 10), stop(2, 10), stop(3, 20)];
  expect(findImuOriginIndex(junction, 9, 10)).toBe(0);
  const revisited = [...junction, stop(4, 10)];
  expect(findImuOriginIndex(revisited, 9, 10)).toBeNull();
  expect(findImuOriginIndex(revisited, 4, 10)).toBe(3);
  expect(findImuOriginIndex([...junction, stop(1, 10)], 1, 10)).toBeNull();
});
