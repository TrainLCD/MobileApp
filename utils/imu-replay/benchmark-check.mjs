import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, writeFile, rm, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compare, runBenchmark, summarize, validateManifest } from './benchmark.mjs';

const sampleCase = { id: 'a', group: 'ride-1', split: 'train', kind: 'synthetic', directory: 'example', config: 'example/config.json', provenance: 'synthetic fixture' };
const manifest = (...cases) => ({ version: 1, cases });
const report = (error = 3, overrides = {}) => ({ phase: 'stopped', missedCandidate: error === null, falseCandidateCount: 0, matchedCandidateErrorSeconds: error, etaErrorSeconds: 5, fusedDistanceErrorM: 2, ...overrides });
const run = (r, overrides = {}) => ({ version: 1, protocol: 'p', split: 'train', kind: 'real', cases: [{ id: 'a', fingerprint: 'abc', report: r }], ...overrides });

test('manifest rejects duplicate cases and journey leakage', () => {
  assert.throws(() => validateManifest(manifest(sampleCase, sampleCase)), /duplicate/);
  assert.throws(() => validateManifest(manifest(sampleCase, { ...sampleCase, id: 'b', split: 'test' })), /crosses splits/);
  validateManifest(manifest(sampleCase, { ...sampleCase, id: 'b', group: 'ride-2', split: 'test', directory: 'other-ride' }));
  assert.throws(() => validateManifest(manifest(sampleCase, { ...sampleCase, id: 'b', group: 'ride-2', split: 'test' })), /Recording crosses splits/);
});

test('directory aliases cannot bypass split or recording checks', () => {
  const members = { 'Accelerometer.csv': 'a', 'Gravity.csv': 'g', 'Gyroscope.csv': 'w' };
  const traintrack = { archive: 'traintrack_data_001.zip', innerZip: 'ride.zip', members };
  const a = { ...sampleCase, traintrack };
  const b = { ...sampleCase, id: 'b', group: 'ride-2', directory: './example' };
  assert.throws(() => validateManifest(manifest(a, { ...b, split: 'test' })), /crosses splits/);
  assert.throws(() => validateManifest(manifest(a, { ...b, traintrack: { ...traintrack, innerZip: 'other.zip' } })), /different recordings/);
  assert.throws(() => validateManifest(manifest(a, b)), /different recordings/);
  validateManifest(manifest(a, { ...b, traintrack: { ...traintrack, members: { 'Gyroscope.csv': 'w', 'Gravity.csv': 'g', 'Accelerometer.csv': 'a' } } }));
  assert.throws(() => validateManifest(manifest(a, { ...b, traintrack, directory: 'elsewhere', split: 'test' })), /crosses splits/);
});

test('misses are penalized and null errors are not zero', () => {
  const summary = summarize([{ report: report(2) }, { report: report(null, { fusedDistanceErrorM: null }) }, { error: 'broken' }]);
  assert.equal(summary.inputFailures, 1);
  assert.equal(summary.missed, 1);
  assert.equal(summary.matchedArrivalMaeSeconds, 2);
  assert.equal(summary.penalizedArrivalMaeSeconds, 6.5);
  assert.equal(summary.distanceCoverage, 1);
});

test('comparison rejects different data and failed cases', () => {
  assert.throws(() => compare(run(report()), run(report(2), { protocol: 'other' })), /protocol/);
  assert.throws(() => compare(run(report()), run(report(2), { cases: [{ id: 'a', fingerprint: 'changed', report: report(2) }] })), /Different input/);
  assert.throws(() => compare(run(report()), run(null)), /failed evaluation/);
});

test('improving timing cannot compensate for false detections or misses', () => {
  assert.equal(compare(run(report(8)), run(report(2))).passes, true);
  assert.equal(compare(run(report(8)), run(report(2, { falseCandidateCount: 1 }))).passes, false);
  assert.equal(compare(run(report(8)), run(report(null))).passes, false);
  assert.equal(compare(run(report(8)), run(report(2, { fusedDistanceErrorM: null }))).passes, false);
  assert.equal(compare(run(report(8)), run(report(8))).passes, false);
});

test('batch uses actual CSV pipeline, fingerprints inputs and retains failures', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'imu-batch-'));
  try {
    await cp(new URL('./example/', import.meta.url), join(dir, 'example'), { recursive: true });
    const path = join(dir, 'manifest.json');
    await writeFile(path, JSON.stringify(manifest(sampleCase, { ...sampleCase, id: 'b', group: 'ride-2', directory: 'missing' })));
    class Stub {
      step(sample) { return { phase: 'stopped', reason: null, arrivalCandidate: sample.timeMs >= 42000, distanceM: 300, imuDistanceM: 300, sigmaM: 1 }; }
    }
    const result = await runBenchmark(path, 'train', Stub, 'stub');
    assert.equal(result.summary.cases, 2);
    assert.equal(result.summary.inputFailures, 1);
    assert.equal(result.cases[0].report.matchedCandidateErrorSeconds, 0);
    const csv = join(dir, 'example', 'Accelerometer.csv');
    await writeFile(csv, (await readFile(csv, 'utf8')).replace('0.0,0,0,0', '0.0,0.01,0,0'));
    const changed = await runBenchmark(path, 'train', Stub, 'stub');
    assert.notEqual(changed.cases[0].fingerprint, result.cases[0].fingerprint);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('shadow replay scores receipt time, preserves native sample time and rejects inferred labels', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'shadow-batch-'));
  try {
    const path = join(dir, 'manifest.json');
    const c = { id: 'leg-1', group: 'ride', kind: 'synthetic', split: 'train', provenance: 'fixture', shadowFile: 'ride.json', legIndex: 0 };
    await writeFile(path, JSON.stringify(manifest(c)));
    assert.throws(() => validateManifest(manifest(c, {...c, id: 'b', legIndex: 1, group: 'other', split: 'test'})), /crosses splits/);
    const recording = {
      schemaVersion: 1, mode: 'imu', endedAtMs: 30000,
      legs: [{startedAtMs: 10000, actualDepartureAtMs: 11000, leg: {fromId: 1, toId: 2, distanceM: 300, etaSeconds: null}}],
      events: [{legIndex: 0, kind: 'arrival', stationId: 2, atMs: 20000}],
      motion: Array.from({length: 201}, (_, i) => ({legIndex: 0, observedAtMs: 10000 + i * 100, sample: {timeMs: 888000 + i * 100}})),
    };
    class Stub {
      step(sample) {
        return {phase: 'stopped', arrivalCandidate: sample.timeMs >= 898100, distanceM: 300, imuDistanceM: 300, sigmaM: 1};
      }
    }
    const run = async () => {
      await writeFile(join(dir, c.shadowFile), JSON.stringify(recording));
      return (await runBenchmark(path, 'train', Stub, 'stub')).cases[0];
    };
    assert.equal((await run()).report.matchedCandidateErrorSeconds, 0.1);
    recording.endedAtMs--;
    assert.match((await run()).error, /post-arrival/);
    recording.endedAtMs++;
    delete recording.legs[0].actualDepartureAtMs;
    recording.events.push({kind: 'departure', legIndex: 0, stationId: 1, atMs: 11000, departureSource: 'imu'});
    assert.match((await run()).error, /observed departure/);
  } finally { await rm(dir, {recursive: true, force: true}); }
});
