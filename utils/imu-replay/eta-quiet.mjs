import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ImuShadowEstimator } from '../../src/lib/imuShadow.ts';

// Exploratory parameters. A candidate is a new quiet spell within the ETA window.
const QUIET_ACCEL_MPS2 = 0.2;
const QUIET_MS = 3000;
const ETA_WINDOW_MS = 30000;
const MAX_SAMPLE_GAP_MS = 500;

function detect(leg, motion) {
  const estimator = new ImuShadowEstimator(leg);
  let departureMs = null;
  let quietSince = null;
  let sawMotion = false;
  let confirmedQuiet = false;
  let previousNative = null;
  let previousReceipt = null;
  let previousCandidate = false;
  const baseline = [];
  const experiment = [];
  for (const { sample, observedAtMs } of motion) {
    const { timeMs, acceleration } = sample;
    if (
      !Number.isFinite(timeMs) ||
      !Number.isFinite(observedAtMs) ||
      (previousReceipt !== null && observedAtMs < previousReceipt)
    ) {
      throw new Error('Invalid motion timestamp');
    }
    previousReceipt = observedAtMs;
    if (previousNative !== null && timeMs <= previousNative) continue;
    const gap =
      previousNative !== null && timeMs - previousNative > MAX_SAMPLE_GAP_MS;
    previousNative = timeMs;
    const estimate = estimator.step(sample);
    if (estimate.arrivalCandidate && !previousCandidate)
      baseline.push(observedAtMs);
    previousCandidate = estimate.arrivalCandidate;
    if (
      departureMs === null &&
      estimate.elapsedSeconds !== null &&
      estimate.phase !== 'invalid'
    ) {
      departureMs = timeMs - estimate.elapsedSeconds * 1000;
    }
    if (
      departureMs === null ||
      !Number.isFinite(leg.etaSeconds) ||
      leg.etaSeconds <= 0
    )
      continue;

    const amplitude =
      acceleration &&
      [acceleration.x, acceleration.y, acceleration.z].every(Number.isFinite)
        ? Math.hypot(acceleration.x, acceleration.y, acceleration.z)
        : Number.NaN;
    if (gap || !Number.isFinite(amplitude)) {
      quietSince = null;
      sawMotion = false;
      confirmedQuiet = false;
    }
    if (!Number.isFinite(amplitude)) continue;
    if (amplitude > QUIET_ACCEL_MPS2) {
      sawMotion = true;
      quietSince = null;
      confirmedQuiet = false;
      continue;
    }
    if (!sawMotion || confirmedQuiet) continue;
    quietSince ??= timeMs;
    if (timeMs - quietSince < QUIET_MS) continue;
    confirmedQuiet = true;
    if (
      Math.abs(timeMs - departureMs - leg.etaSeconds * 1000) <= ETA_WINDOW_MS
    ) {
      experiment.push(observedAtMs);
    }
  }
  return { baseline, experiment, detectedDeparture: departureMs !== null };
}

function score(candidates, arrivalMs) {
  const errorsSeconds = candidates.map((time) => (time - arrivalMs) / 1000);
  const matched = errorsSeconds.some((error) => Math.abs(error) <= 10);
  return {
    errorsSeconds,
    matched,
    falseCandidates: errorsSeconds.length - Number(matched),
    earlyCandidates: errorsSeconds.filter((error) => error < -10).length,
  };
}

export function compareQuietStops(recording) {
  if (recording.schemaVersion !== 1 || recording.mode !== 'imu') {
    throw new Error('Expected a version 1 IMU shadow recording');
  }
  return recording.legs.map(({ leg, missingMotionSample }, legIndex) => {
    const events = recording.events.filter(
      (event) =>
        event.legIndex === legIndex &&
        event.kind === 'arrival' &&
        event.stationId === leg.toId
    );
    if (missingMotionSample) return { legIndex, status: 'missing-motion' };
    if (!events.length) return { legIndex, status: 'no-arrival-label' };
    const arrivalMs = events[0].atMs;
    if (events.length !== 1 || !Number.isFinite(arrivalMs))
      throw new Error('Invalid arrival label');
    const motion = recording.motion.filter((row) => row.legIndex === legIndex);
    if (!motion.length) return { legIndex, status: 'missing-motion' };
    const { baseline, experiment, detectedDeparture } = detect(leg, motion);
    return {
      legIndex,
      status: 'observed',
      detectedDeparture,
      etaSeconds: leg.etaSeconds,
      lastSampleRelativeToArrivalSeconds:
        (motion.at(-1).observedAtMs - arrivalMs) / 1000,
      baseline: score(baseline, arrivalMs),
      experiment: score(experiment, arrivalMs),
    };
  });
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  if (process.argv.length !== 3)
    throw new Error('Usage: eta-quiet.mjs RECORDING.json');
  const recording = JSON.parse(await readFile(process.argv[2], 'utf8'));
  console.log(JSON.stringify(compareQuietStops(recording), null, 2));
}
