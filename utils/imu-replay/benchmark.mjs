import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { evaluate, motionSamples, parseVectorCsv } from './replay.mjs';

import { evaluateShadow } from './shadow.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const splits = ['train', 'validation', 'test'];
const sensors = ['Accelerometer.csv', 'Gravity.csv', 'Gyroscope.csv'];
const hash = (value) => createHash('sha256').update(value).digest('hex');
const mean = (values) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
const absMean = (values) => mean(values.filter(Number.isFinite).map(Math.abs));

export function validateManifest(manifest, root = '/') {
  if (manifest.version !== 1 || !Array.isArray(manifest.cases) || !manifest.cases.length) throw new Error('Invalid manifest');
  const ids = new Set();
  const groups = new Map();
  const recordings = new Map();
  const directories = new Map();
  const shadowLegs = new Set();
  for (const c of manifest.cases) {
    if (![c.id, c.group, c.provenance].every((s) => typeof s === 'string' && s.trim()) ||
        !splits.includes(c.split) || !['synthetic', 'real'].includes(c.kind) || ids.has(c.id)) throw new Error('Invalid or duplicate case');
    if (groups.has(c.group) && groups.get(c.group) !== c.split) throw new Error('Journey group crosses splits');
    ids.add(c.id);
    groups.set(c.group, c.split);
    if (c.shadowFile !== undefined) {
      if (typeof c.shadowFile !== 'string' || !c.shadowFile.trim() || c.traintrack || c.directory || c.config ||
          !Number.isSafeInteger(c.legIndex) || c.legIndex < 0) throw new Error('Invalid shadow case');
      const file = datasetPath(root, c.shadowFile);
      const key = JSON.stringify([file, c.legIndex]);
      if (shadowLegs.has(key)) throw new Error('Duplicate shadow leg');
      shadowLegs.add(key);
      if (recordings.has(file) && recordings.get(file) !== c.split) throw new Error('Recording crosses splits');
      recordings.set(file, c.split);
      continue;
    }
    if (![c.directory, c.config].every(s => typeof s === 'string' && s.trim())) throw new Error('Invalid CSV case');
    const directory = datasetPath(root, c.directory);
    const source = c.traintrack ? JSON.stringify([c.traintrack.archive, c.traintrack.innerZip ?? null, sensors.map((name) => c.traintrack.members[name])]) : directory;
    const previous = directories.get(directory);
    if (previous && previous.split !== c.split) throw new Error('Recording crosses splits: directory');
    if (previous && previous.source !== source) throw new Error('Directory shared by different recordings');
    directories.set(directory, { split: c.split, source });
    if (recordings.has(source) && recordings.get(source) !== c.split) throw new Error('Recording crosses splits');
    recordings.set(source, c.split);
  }
}

function datasetPath(root, path) {
  const result = resolve(root, path);
  const rel = relative(root, result);
  if (!rel || rel === '..' || rel.startsWith('../') || rel.startsWith('..\\') || isAbsolute(rel)) throw new Error('Path outside dataset root');
  return result;
}

export function summarize(cases) {
  const valid = cases.filter((c) => c.report);
  const reports = valid.map((c) => c.report);
  return {
    cases: cases.length,
    inputFailures: cases.length - valid.length,
    missed: reports.filter((r) => r.missedCandidate).length,
    falseCandidates: reports.reduce((a, r) => a + r.falseCandidateCount, 0),
    invalid: reports.filter((r) => r.phase === 'invalid').length,
    matchedArrivalMaeSeconds: absMean(reports.map((r) => r.matchedCandidateErrorSeconds)),
    // A miss costs more than any matched candidate in the fixed ±10 s window.
    penalizedArrivalMaeSeconds: mean(reports.map((r) => r.missedCandidate ? 11 : Math.abs(r.matchedCandidateErrorSeconds))),
    etaMaeSeconds: absMean(reports.map((r) => r.etaErrorSeconds)),
    distanceMaeM: absMean(reports.map((r) => r.fusedDistanceErrorM)),
    distanceCoverage: reports.filter((r) => Number.isFinite(r.fusedDistanceErrorM)).length,
  };
}

export async function runBenchmark(manifestPath, split, Estimator, estimatorHash, { download = false } = {}) {
  if (!splits.includes(split)) throw new Error('Invalid split');
  const root = dirname(resolve(manifestPath));
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  validateManifest(manifest, root);
  const chosen = manifest.cases.filter((c) => c.split === split).sort((a, b) => a.id.localeCompare(b.id));
  if (!chosen.length) throw new Error('No cases in split');
  if (chosen.some((c) => c.kind !== chosen[0].kind)) throw new Error('Do not mix real and synthetic cases');
  if (chosen.some((c) => c.traintrack)) {
    const args = [resolve(here, 'prepare.py'), resolve(manifestPath), split];
    if (download) args.push('--download');
    const result = spawnSync('python3', args, { stdio: 'inherit' });
    if (result.error || result.status !== 0) throw new Error('Dataset preparation failed');
  }
  const cases = [];
  for (const c of chosen) {
    let fingerprint = null;
    try {
      if (c.shadowFile !== undefined) {
        const bytes = await readFile(datasetPath(root, c.shadowFile));
        fingerprint = hash(JSON.stringify([c.id, c.group, c.kind, c.provenance, c.legIndex, hash(bytes)]));
        const report = evaluateShadow(Estimator, JSON.parse(bytes), c.legIndex);
        cases.push({ id: c.id, group: c.group, fingerprint, report });
        continue;
      }
      const configBytes = await readFile(datasetPath(root, c.config));
      const bytes = await Promise.all(sensors.map((name) => readFile(resolve(datasetPath(root, c.directory), name))));
      fingerprint = hash(JSON.stringify([c.id, c.group, c.kind, c.provenance, hash(configBytes), ...bytes.map(hash)]));
      const config = JSON.parse(configBytes.toString('utf8'));
      const [accel, gravity, gyro] = bytes.map((data) => parseVectorCsv(data.toString('utf8')));
      const report = evaluate(Estimator, motionSamples(accel, gravity, gyro, config), config);
      cases.push({ id: c.id, group: c.group, fingerprint, report });
    } catch (error) {
      cases.push({ id: c.id, group: c.group, fingerprint, error: String(error.message ?? error) });
    }
  }
  const protocol = hash(JSON.stringify(await Promise.all(['benchmark.mjs', 'replay.mjs', 'shadow.mjs'].map(async (name) => hash(await readFile(resolve(here, name)))))));
  return { version: 1, protocol, estimatorHash, split, kind: chosen[0].kind, cases, summary: summarize(cases) };
}

export function compare(before, after) {
  if (before.version !== 1 || after.version !== 1 || before.protocol !== after.protocol || before.split !== after.split || before.kind !== after.kind) throw new Error('Evaluation protocol or split differs');
  if (!before.cases.length || before.cases.length !== after.cases.length) throw new Error('Case count differs');
  for (const [index, a] of before.cases.entries()) {
    const b = after.cases[index];
    if (!a.fingerprint || a.id !== b.id || a.fingerprint !== b.fingerprint || !a.report || !b.report) throw new Error(`Different input or failed evaluation: ${a.id}`);
  }
  const a = summarize(before.cases);
  const b = summarize(after.cases);
  const regressions = ['missed', 'falseCandidates', 'invalid', 'penalizedArrivalMaeSeconds'].filter((key) => b[key] > a[key]);
  if (before.cases.some((c, i) => Number.isFinite(c.report.fusedDistanceErrorM) && !Number.isFinite(after.cases[i].report.fusedDistanceErrorM))) regressions.push('distanceCoverage');
  // Distance MAE is only directly comparable on the same set of valid cases.
  const sameCoverage = before.cases.every((c, i) => Number.isFinite(c.report.fusedDistanceErrorM) === Number.isFinite(after.cases[i].report.fusedDistanceErrorM));
  if (sameCoverage && a.distanceMaeM !== null && b.distanceMaeM > a.distanceMaeM) regressions.push('distanceMaeM');
  const improved = b.missed < a.missed || b.falseCandidates < a.falseCandidates || b.invalid < a.invalid || b.penalizedArrivalMaeSeconds < a.penalizedArrivalMaeSeconds;
  return { before: a, after: b, regressions, improved, passes: improved && !regressions.length, realEvidence: before.kind === 'real', perCase: before.cases.map((c, i) => ({ id: c.id, before: c.report, after: after.cases[i].report })) };
}

async function main() {
  const [command, a, b, c, ...flags] = process.argv.slice(2);
  if (command === 'run' && a && b && c) {
    const estimatorFlag = flags.find((v) => v.startsWith('--estimator='));
    const path = estimatorFlag ? resolve(estimatorFlag.slice('--estimator='.length)) : resolve(here, '../../src/lib/imuShadow.ts');
    const { ImuShadowEstimator } = await import(pathToFileURL(path).href);
    const report = await runBenchmark(a, b, ImuShadowEstimator, hash(await readFile(path)), { download: flags.includes('--download') });
    await writeFile(c, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify(report.summary, null, 2));
    if (report.summary.inputFailures) process.exitCode = 2;
  } else if (command === 'compare' && a && b && c) {
    const result = compare(JSON.parse(await readFile(a, 'utf8')), JSON.parse(await readFile(b, 'utf8')));
    await writeFile(c, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify({ ...result, perCase: undefined }, null, 2));
    if (!result.passes) process.exitCode = 3;
  } else throw new Error('Usage: benchmark.mjs run MANIFEST SPLIT REPORT [--download] [--estimator=FILE] | compare BEFORE AFTER REPORT');
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main().catch((e) => { console.error(e.message); process.exitCode = 1; });
