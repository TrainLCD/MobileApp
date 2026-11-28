import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluate, motionSamples, parseVectorCsv } from './replay.mjs';

const config = { startMs: 0, endMs: 20000, departureMs: 1000, arrivalMs: 10000, leg: { fromId: 1, toId: 2, distanceM: 100, etaSeconds: 10, missingPairs: [] } };
const rows = (z = 0, x = 0) => Array.from({ length: 201 }, (_, i) => ({ timeMs: i * 100, x, y: 0, z }));

test('numeric CSV uses named columns and seconds rather than epoch timestamps', () => {
  assert.deepEqual(parseVectorCsv('time,seconds_elapsed,z,y,x\n1000000000,1,3,2,1'), [{ timeMs: 1000, x: 1, y: 2, z: 3 }]);
  assert.throws(() => parseVectorCsv('seconds_elapsed,x,y,z\n1,,0,0'), /Invalid/);
  assert.throws(() => parseVectorCsv('seconds_elapsed,x,y,z\n1,1,0,0\n1,0,0,0'), /non-increasing/);
});

test('normalizes gravity and gyro units, retaining source time', () => {
  const samples = [...motionSamples(rows(0, 1), rows(9.81), rows(Math.PI / 2), config)];
  assert.deepEqual(samples[0], { timeMs: 0, acceleration: { x: 1, y: 0, z: 0 }, accelerationIncludingGravity: { x: 1, y: 0, z: 9.81 }, rotationDegPerSecond: 90 });
  assert.equal(samples.length, 201);
  assert.equal(samples[1].timeMs, 100);
});

test('rejects stale or absent auxiliary samples rather than inventing zeros', () => {
  assert.throws(() => [...motionSamples(rows(), rows(9.81).slice(0, 1), rows(), config)], /Missing synchronized/);
});

test('uses only past measurements and does not fill an acceleration gap', () => {
  const source = rows().filter(({ timeMs }) => timeMs <= 100 || timeMs >= 800);
  const samples = [...motionSamples(source, rows(9.81), rows(), config)];
  assert.deepEqual(samples.slice(0, 3).map((s) => s.timeMs), [0, 100, 800]);
  assert.throws(() => [...motionSamples(rows(), rows(9.81).map((v) => ({ ...v, timeMs: v.timeMs + 10 })), rows(), config)], /Missing synchronized/);
});

test('keeps a boundary sample when downsampling would introduce a gap', () => {
  const source = [0, 50, 550, 650].map((timeMs) => ({ timeMs, x: 0, y: 0, z: 0 }));
  const gravity = source.map((v) => ({ ...v, z: 9.81 }));
  const samples = [...motionSamples(source, gravity, source, { ...config, endMs: 650 })];
  assert.deepEqual(samples.map((s) => s.timeMs), [0, 50, 550, 650]);
  assert.deepEqual([...motionSamples(rows(), rows(9.81), rows(), config)].map((s) => s.timeMs), rows().map((s) => s.timeMs));
});

test('does not hide a real gap at a downsampling boundary', () => {
  const source = [0, 50, 551, 650].map((timeMs) => ({ timeMs, x: 0, y: 0, z: 0 }));
  const gravity = source.map((v) => ({ ...v, z: 9.81 }));
  const samples = [...motionSamples(source, gravity, source, { ...config, endMs: 650 })];
  assert.deepEqual(samples.map((s) => s.timeMs), [0, 50, 551, 650]);
  assert.equal(samples[2].timeMs - samples[1].timeMs, 501);
});

test('evaluation passes only motion samples to estimator and scores candidate edges', () => {
  class StubEstimator {
    constructor(leg) { assert.equal(leg.distanceM, 100); }
    step(sample) {
      return { phase: 'stopped', reason: null, arrivalCandidate: sample.timeMs >= 11000 && sample.timeMs < 13000, distanceM: 98, imuDistanceM: 90, sigmaM: 3 };
    }
  }
  const report = evaluate(StubEstimator, motionSamples(rows(), rows(9.81), rows(), config), config);
  assert.equal(report.sampleCount, 201);
  assert.deepEqual(report.candidateErrorsSeconds, [1]);
  assert.equal(report.etaErrorSeconds, 1);
  assert.equal(report.falseCandidateCount, 0);
  assert.equal(report.missedCandidate, false);
  assert.equal(report.fusedDistanceErrorM, -2);
  assert.equal(report.imuDistanceErrorM, -10);
  assert.throws(() => evaluate(StubEstimator, motionSamples(rows().slice(0, 5), rows(9.81), rows(), config), config), /coverage/);
});
