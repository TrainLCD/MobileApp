import assert from 'node:assert/strict';
import test from 'node:test';
import { compareQuietStops } from './eta-quiet.mjs';

function recording(quiet, etaSeconds = 60) {
  // Native sensor and label clocks have different origins.
  const motion = [];
  for (let t = 0; t <= 75000; t += 100) {
    const x = quiet(t) ? 0.1 : 1;
    motion.push({
      legIndex: 0,
      observedAtMs: 200000 + t,
      sample: {
        timeMs: 70000 + t,
        acceleration: { x, y: 0, z: 0 },
        accelerationIncludingGravity: { x, y: 0, z: 9.81 },
        rotationDegPerSecond: 0,
      },
    });
  }
  return {
    schemaVersion: 1,
    mode: 'imu',
    legs: [{ leg: { fromId: 1, toId: 2, distanceM: 900, etaSeconds } }],
    events: [{ legIndex: 0, kind: 'arrival', stationId: 2, atMs: 260000 }],
    motion,
  };
}

test('scores a quiet transition once using receipt time, counting early or extra candidates', () => {
  const data = recording((t) => (t >= 32000 && t <= 38000) || t >= 58000);
  const [result] = compareQuietStops(data);
  assert.deepEqual(result.experiment, {
    errorsSeconds: [-25, 1],
    matched: true,
    falseCandidates: 1,
    earlyCandidates: 1,
  });
  data.events[0].atMs += 4000;
  assert.deepEqual(
    compareQuietStops(data)[0].experiment.errorsSeconds,
    [-29, -3]
  );
});

test('requires motion followed by quiet in the ETA window and an IMU departure', () => {
  for (const data of [
    recording((t) => t >= 5000),
    recording(() => true),
    recording((t) => t >= 58000, null),
    recording((t) => t >= 58000 && t < 60000),
  ])
    assert.deepEqual(compareQuietStops(data)[0].experiment.errorsSeconds, []);
});

test('does not bridge a gap or a missing acceleration sample during quiet', () => {
  for (const gap of [true, false]) {
    const data = recording((t) => t >= 58000);
    if (gap)
      data.motion = data.motion.filter(
        (row) => row.sample.timeMs < 129000 || row.sample.timeMs > 130000
      );
    else data.motion[590].sample.acceleration = null;
    assert.deepEqual(compareQuietStops(data)[0].experiment.errorsSeconds, []);
  }
});

test('reports incomplete legs and truncated observation windows', () => {
  const data = recording((t) => t >= 58000);
  data.motion = data.motion.filter((row) => row.observedAtMs <= 262000);
  data.legs.push(data.legs[0], { ...data.legs[0], missingMotionSample: true });
  const [first, second, third] = compareQuietStops(data);
  assert.equal(first.lastSampleRelativeToArrivalSeconds, 2);
  assert.equal(second.status, 'no-arrival-label');
  assert.equal(third.status, 'missing-motion');
});
