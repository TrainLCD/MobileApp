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
