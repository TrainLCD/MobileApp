import {
  buildLeg,
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
