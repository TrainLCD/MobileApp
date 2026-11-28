// Human labels and JS observation times share a clock. Keep the native timestamp
// on each motion sample for integration, even if JS received callbacks in a burst.
import { evaluate } from './replay.mjs';

export function evaluateShadow(Estimator, recording, legIndex) {
  if (recording.schemaVersion !== 1 || recording.mode !== 'imu')
    throw new Error('Expected an IMU shadow recording');
  const entry = recording.legs[legIndex];
  if (!entry) throw new Error('Unknown leg');
  if (entry.missingMotionSample) throw new Error('Unrecorded motion callback');
  const events = recording.events.filter(
    (event) => event.legIndex === legIndex
  );
  const manual = events.filter(
    (e) =>
      e.kind === 'departure' &&
      e.departureSource == null &&
      e.stationId === entry.leg.fromId
  );
  const arrivals = events.filter(
    (e) => e.kind === 'arrival' && e.stationId === entry.leg.toId
  );
  const departures = [
    ...manual.map((e) => e.atMs),
    ...(entry.actualDepartureAtMs == null ? [] : [entry.actualDepartureAtMs]),
  ];
  if (departures.length !== 1 || arrivals.length !== 1)
    throw new Error('Need one observed departure and arrival');
  const arrivalMs = arrivals[0].atMs;
  const endMs = arrivalMs + 10000;
  const boundary =
    recording.legs[legIndex + 1]?.startedAtMs ?? recording.endedAtMs;
  if (!Number.isFinite(boundary) || boundary < endMs)
    throw new Error('Incomplete post-arrival window');
  const motion = [];
  let previous = entry.startedAtMs;
  for (const row of recording.motion) {
    if (row.legIndex !== legIndex) continue;
    if (
      !Number.isFinite(row.observedAtMs) ||
      row.observedAtMs < previous ||
      row.observedAtMs > boundary
    )
      throw new Error('Invalid observation clock');
    previous = row.observedAtMs;
    if (row.observedAtMs <= endMs) motion.push(row);
  }
  const config = {
    leg: entry.leg,
    startMs: entry.startedAtMs,
    departureMs: departures[0],
    arrivalMs,
    endMs,
  };
  return evaluate(
    Estimator,
    motion.map((row) => row.sample),
    config,
    (_, i) => motion[i].observedAtMs
  );
}
