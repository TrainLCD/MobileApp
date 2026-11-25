import type { Estimate, Leg, MotionSample, RouteStop } from './imuShadow';

export type Mode = 'imu' | 'baseline';
export type Reference = {
  stationId: number | null;
  arrived: boolean;
  rawLocationTimeMs: number | null;
  rawAccuracyM: number | null;
  rawSpeedMps: number | null;
  filteredLocationTimeMs: number | null;
  etaPhase:
    | { kind: 'DWELLING'; stationId: number }
    | { kind: 'RUNNING' | 'APPROACHING'; targetStationId: number }
    | null;
  etaAnchor: {
    stationId: number;
    kind: 'AT_STATION' | 'DEPARTED';
    observedAtMs: number;
  } | null;
};
export type Recording = {
  schemaVersion: 1;
  mode: Mode;
  appVersion: string | null;
  buildNumber: string | null;
  platform: string;
  osVersion: string | number;
  startedAtMs: number;
  endedAtMs: number | null;
  endReason: string | null;
  stops: RouteStop[];
  legs: { startedAtMs: number; leg: Leg }[];
  motion: { observedAtMs: number; legIndex: number; sample: MotionSample }[];
  observations: {
    atMs: number;
    legIndex: number;
    estimate: Estimate | null;
    reference: Reference;
  }[];
  events: {
    atMs: number;
    legIndex: number;
    kind: 'departure' | 'arrival' | 'candidate' | 'candidate-lost';
    stationId: number;
    estimate: Estimate | null;
    reference: Reference;
  }[];
  battery: { atMs: number; level: number | null; state: number | null }[];
};

// A completed recording is available after leaving Main. No network or persistent
// database writes take place. The next explicitly started recording replaces it.
let lastRecording: Recording | null = null;
export const getLastImuShadowRecording = (): Recording | null => lastRecording;
export const rememberImuShadowRecording = (recording: Recording): void => {
  lastRecording = recording;
};

export const getLegComparison = (recording: Recording, legIndex: number) => {
  const leg = recording.legs[legIndex]?.leg;
  if (!leg) {
    return null;
  }
  const events = recording.events.filter(
    (event) => event.legIndex === legIndex
  );
  const departure = events.find((event) => event.kind === 'departure');
  const arrival = events.find((event) => event.kind === 'arrival');
  const candidates = events.filter((event) => event.kind === 'candidate');
  const expectedAtMs =
    departure && leg.etaSeconds != null
      ? departure.atMs + leg.etaSeconds * 1000
      : null;
  const observations = recording.observations.filter(
    (item) => item.legIndex === legIndex
  );
  const targetIds = [leg.toId, ...(leg.toAliases ?? [])];
  const etaDetection = observations.find(
    (item) =>
      item.reference.etaPhase?.kind === 'DWELLING' &&
      targetIds.includes(item.reference.etaPhase.stationId)
  );
  const gpsDetection = observations.find(
    (item) =>
      item.reference.arrived &&
      item.reference.stationId != null &&
      targetIds.includes(item.reference.stationId)
  );
  // This matching window is a reporting convention, not a production detection rule.
  const arrivalMatchWindowSeconds = 10;
  const candidateErrors = arrival
    ? candidates.map((event) => (event.atMs - arrival.atMs) / 1000)
    : null;
  const hasMatch =
    candidateErrors?.some(
      (error) => Math.abs(error) <= arrivalMatchWindowSeconds
    ) ?? false;
  return {
    fromId: leg.fromId,
    toId: leg.toId,
    departureAtMs: departure?.atMs ?? null,
    actualArrivalAtMs: arrival?.atMs ?? null,
    etaArrivalAtMs: expectedAtMs,
    etaErrorSeconds:
      expectedAtMs != null && arrival
        ? (expectedAtMs - arrival.atMs) / 1000
        : null,
    existingEtaArrivalAtMs: etaDetection?.atMs ?? null,
    existingEtaErrorSeconds:
      etaDetection && arrival
        ? (etaDetection.atMs - arrival.atMs) / 1000
        : null,
    gpsArrivalAtMs: gpsDetection?.atMs ?? null,
    gpsErrorSeconds:
      gpsDetection && arrival
        ? (gpsDetection.atMs - arrival.atMs) / 1000
        : null,
    arrivalMatchWindowSeconds,
    candidateErrorsSeconds: candidateErrors,
    falseCandidateCount:
      candidateErrors == null
        ? null
        : candidateErrors.length - (hasMatch ? 1 : 0),
    missedCandidate:
      recording.mode === 'imu' && arrival != null ? !hasMatch : null,
    distanceErrorM:
      arrival?.estimate &&
      leg.distanceM != null &&
      arrival.estimate.phase !== 'invalid'
        ? arrival.estimate.distanceM - leg.distanceM
        : null,
    imuDistanceErrorM:
      arrival?.estimate &&
      leg.distanceM != null &&
      arrival.estimate.phase !== 'invalid'
        ? arrival.estimate.imuDistanceM - leg.distanceM
        : null,
  };
};

export const serializeImuShadowRecording = (recording: Recording): string =>
  JSON.stringify({
    ...recording,
    comparisons: recording.legs.map((_, index) =>
      getLegComparison(recording, index)
    ),
  });
