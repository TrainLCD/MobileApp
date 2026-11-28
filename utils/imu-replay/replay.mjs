import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Sensor Logger's numeric CSVs use seconds_elapsed, x, y, z. Ignore column order.
export function parseVectorCsv(csv) {
  const [header, ...rows] = csv.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
  const columns = header.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
  const indexes = ['seconds_elapsed', 'x', 'y', 'z'].map((v) => columns.indexOf(v));
  if (indexes.some((i) => i < 0)) throw new Error('Missing sensor CSV columns');
  let previous = -Infinity;
  const result = rows.filter((row) => row.trim()).map((row, i) => {
    const cells = row.split(',');
    const values = indexes.map((index) => {
      const value = cells[index]?.trim().replace(/^"|"$/g, '');
      return value ? Number(value) : NaN;
    });
    const [seconds, x, y, z] = values;
    if (!values.every(Number.isFinite) || seconds < 0 || seconds <= previous) {
      throw new Error(`Invalid or non-increasing sensor row ${i + 2}`);
    }
    previous = seconds;
    return { timeMs: seconds * 1000, x, y, z };
  });
  if (!result.length) throw new Error('Empty sensor CSV');
  return result;
}

function causalLookup(rows) {
  let index = -1;
  return (timeMs) => {
    while (index + 1 < rows.length && rows[index + 1].timeMs <= timeMs) index++;
    return index < 0 ? null : rows[index];
  };
}

export function* motionSamples(accel, gravity, gyro, config) {
  const { startMs, endMs, intervalMs = 100, maxSkewMs = 50 } = config;
  if (![startMs, endMs, intervalMs, maxSkewMs].every(Number.isFinite) ||
      startMs < 0 || endMs <= startMs || intervalMs <= 0 || intervalMs > 500 ||
      maxSkewMs < 0 || maxSkewMs > 500) throw new Error('Invalid replay interval');
  const gravityAt = causalLookup(gravity);
  const gyroAt = causalLookup(gyro);
  let nextMs = startMs;
  let lastEmittedMs = null;
  for (const [index, a] of accel.entries()) {
    if (a.timeMs < startMs || a.timeMs > endMs) continue;
    const next = accel[index + 1];
    // Keep a boundary sample if dropping it would introduce a sensor gap.
    if (
      a.timeMs < nextMs &&
      !(lastEmittedMs !== null && next && next.timeMs <= endMs &&
        next.timeMs - lastEmittedMs > 500)
    ) continue;
    const g = gravityAt(a.timeMs);
    const w = gyroAt(a.timeMs);
    if (!g || !w || a.timeMs - g.timeMs > maxSkewMs || a.timeMs - w.timeMs > maxSkewMs) {
      throw new Error(`Missing synchronized gravity/gyro at ${a.timeMs} ms`);
    }
    // Preserve actual sample time; do not interpolate gaps or invent stationary data.
    nextMs = Math.max(nextMs, startMs + (Math.floor((a.timeMs - startMs) / intervalMs) + 1) * intervalMs);
    lastEmittedMs = a.timeMs;
    yield {
      timeMs: a.timeMs - startMs,
      acceleration: { x: a.x, y: a.y, z: a.z },
      accelerationIncludingGravity: { x: a.x + g.x, y: a.y + g.y, z: a.z + g.z },
      rotationDegPerSecond: Math.hypot(w.x, w.y, w.z) * 180 / Math.PI,
    };
  }
}

export function evaluate(Estimator, samples, config, observationTime = (sample) => config.startMs + sample.timeMs) {
  const { leg, startMs, endMs, departureMs, arrivalMs } = config;
  if (!leg || !(leg.distanceM > 0) || !Number.isFinite(leg.distanceM) ||
      (leg.etaSeconds !== null && !(Number.isFinite(leg.etaSeconds) && leg.etaSeconds > 0)) ||
      ![startMs, endMs, departureMs, arrivalMs].every(Number.isFinite) ||
      !(startMs < departureMs && departureMs < arrivalMs && arrivalMs < endMs)) {
    throw new Error('Provide independent distance and ordered ground-truth labels');
  }
  if (endMs - arrivalMs < 10000) throw new Error('Include at least 10 s after arrival');
  const estimator = new Estimator(leg);
  const candidates = [];
  let previousCandidate = false;
  let atArrival = null;
  let last = null;
  let firstMs = null;
  let lastMs = null;
  let count = 0;
  for (const sample of samples) {
    const timeMs = observationTime(sample, count);
    firstMs ??= timeMs;
    lastMs = timeMs;
    count++;
    last = estimator.step(sample);
    if (last.arrivalCandidate && !previousCandidate) candidates.push(timeMs);
    previousCandidate = last.arrivalCandidate;
    if (timeMs <= arrivalMs) atArrival = { timeMs, estimate: last };
  }
  if (firstMs === null || lastMs === null || firstMs - startMs > 500 || endMs - lastMs > 500 ||
      !atArrival || arrivalMs - atArrival.timeMs > 500) {
    throw new Error('Sensor coverage is incomplete around start, arrival or end');
  }
  const candidateErrorsSeconds = candidates.map((time) => (time - arrivalMs) / 1000);
  const matchedIndex = candidateErrorsSeconds.reduce((best, error, i) => {
    return Math.abs(error) <= 10 && (best < 0 || Math.abs(error) < Math.abs(candidateErrorsSeconds[best])) ? i : best;
  }, -1);
  const validAtArrival = atArrival.estimate.phase !== 'invalid';
  return {
    sampleCount: count,
    phase: last.phase,
    invalidReason: last.reason,
    etaErrorSeconds: leg.etaSeconds == null ? null : (departureMs - arrivalMs) / 1000 + leg.etaSeconds,
    candidateErrorsSeconds,
    matchedCandidateErrorSeconds: matchedIndex < 0 ? null : candidateErrorsSeconds[matchedIndex],
    falseCandidateCount: candidates.length - (matchedIndex < 0 ? 0 : 1),
    missedCandidate: matchedIndex < 0,
    fusedDistanceErrorM: validAtArrival ? atArrival.estimate.distanceM - leg.distanceM : null,
    imuDistanceErrorM: validAtArrival ? atArrival.estimate.imuDistanceM - leg.distanceM : null,
    sigmaAtArrivalM: validAtArrival ? atArrival.estimate.sigmaM : null,
  };
}

async function main() {
  const [configPath, directory] = process.argv.slice(2);
  if (!configPath || !directory) throw new Error('Usage: node --experimental-transform-types utils/imu-replay/replay.mjs config.json sensor-directory');
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  const [accel, gravity, gyro] = await Promise.all(
    ['Accelerometer.csv', 'Gravity.csv', 'Gyroscope.csv'].map(async (name) =>
      parseVectorCsv(await readFile(resolve(directory, name), 'utf8'))),
  );
  const { ImuShadowEstimator } = await import('../../src/lib/imuShadow.ts');
  const report = evaluate(ImuShadowEstimator, motionSamples(accel, gravity, gyro, config), config);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === pathToFileURL(fileURLToPath(import.meta.url)).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
