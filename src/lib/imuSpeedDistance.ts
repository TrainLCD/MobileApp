import type { Leg } from './imuShadow';
import type { Recording } from './imuShadowRecording';

// Integrate only consecutive accepted speed fixes within one normal location interval.
// The result is partial when the OS does not supply speed over the whole leg.
export function compareSpeedDistance(
  leg: Leg,
  observations: Recording['observations'],
  departureMs: number | null,
  arrivalLabelMs: number | null,
  maxIntervalMs: number
) {
  let previous: { timeMs: number; speed: number } | null = null;
  let latestSeenTime = Number.NEGATIVE_INFINITY;
  let distanceM = 0;
  let coveredMs = 0;
  let distanceAtLabelM: number | null = null;
  let coveredAtLabelMs: number | null = null;
  let candidateAtMs: number | null = null;
  let sawMovement = false;
  for (const { atMs, reference } of observations) {
    if (departureMs == null || atMs < departureMs) continue;
    const timeMs = reference.rawLocationTimeMs;
    const speed = reference.rawSpeedMps;
    if (
      timeMs == null ||
      !Number.isFinite(timeMs) ||
      !Number.isFinite(atMs) ||
      timeMs > atMs
    ) {
      previous = null;
      continue;
    }
    if (timeMs < departureMs || timeMs < latestSeenTime) continue;
    const repeated = timeMs === latestSeenTime;
    latestSeenTime = timeMs;
    if (
      reference.filteredLocationTimeMs !== timeMs ||
      atMs - timeMs > maxIntervalMs ||
      speed == null ||
      !Number.isFinite(speed) ||
      speed < 0
    ) {
      previous = null;
      continue;
    }
    // A single location fix may be present in many successive snapshots.
    if (repeated && previous) continue;
    if (previous && timeMs - previous.timeMs <= maxIntervalMs) {
      const dtMs = timeMs - previous.timeMs;
      distanceM += ((previous.speed + speed) / 2) * (dtMs / 1000);
      coveredMs += dtMs;
      if (arrivalLabelMs != null && atMs <= arrivalLabelMs) {
        distanceAtLabelM = distanceM;
        coveredAtLabelMs = coveredMs;
      }
    }
    previous = { timeMs, speed };
    sawMovement ||= speed > 3;
    const stationId = reference.locationArrivalStationId;
    if (
      candidateAtMs == null &&
      sawMovement &&
      coveredMs > 0 &&
      speed < 0.6 &&
      stationId != null &&
      (leg.toId === stationId || leg.toAliases?.includes(stationId)) &&
      leg.distanceM != null &&
      leg.distanceM > 0 &&
      Math.abs(distanceM - leg.distanceM) <=
        Math.min(70, Math.max(20, leg.distanceM * 0.08))
    )
      candidateAtMs = atMs;
  }
  return { distanceAtLabelM, coveredAtLabelMs, candidateAtMs };
}
