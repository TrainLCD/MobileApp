import type { LocationObject } from 'expo-location';
import isPointWithinRadius from 'geolib/es/isPointWithinRadius';
import { LOCATION_TIME_INTERVAL } from '~/constants/location';
import { getAccuracyBonus } from '~/utils/accuracyBonus';
import type { Estimate, Leg, MotionSample, RouteStop } from './imuShadow';

export type Mode = 'imu' | 'baseline';
export type Reference = {
  stationId: number | null;
  arrived: boolean;
  locationArrivalStationId: number | null;
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
// Match the lifetime of the correction in useRefreshStation.
export const isManualCorrectionActive = (
  correction: {
    location: LocationObject | null;
    stations: readonly unknown[];
  } | null,
  location: LocationObject | null,
  stations: readonly unknown[]
): boolean =>
  correction != null &&
  correction.location === location &&
  correction.stations === stations;

// Expo Location reports OS location, not satellite-only GNSS. Require a recent,
// accepted coordinate that supports the shared arrival state, rather than
// treating a missing fix, grace period or manual station correction as GPS.
export const getLocationArrivalStationId = ({
  raw,
  filtered,
  station,
  arrived,
  manualCorrection,
  arrivedThreshold,
  atMs,
  legStartedAtMs,
}: {
  raw: LocationObject | null;
  filtered: LocationObject | null;
  station: {
    id?: number | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  arrived: boolean;
  manualCorrection: boolean;
  arrivedThreshold: number;
  atMs: number;
  legStartedAtMs: number;
}): number | null => {
  if (
    !arrived ||
    manualCorrection ||
    !raw ||
    !filtered ||
    !station ||
    station.id == null ||
    raw.timestamp !== filtered.timestamp ||
    !Number.isFinite(filtered.timestamp) ||
    filtered.timestamp < legStartedAtMs ||
    filtered.timestamp > atMs ||
    atMs - filtered.timestamp > LOCATION_TIME_INTERVAL ||
    station.latitude == null ||
    station.longitude == null
  )
    return null;
  const { latitude, longitude, accuracy } = filtered.coords;
  if (
    ![
      latitude,
      longitude,
      station.latitude,
      station.longitude,
      raw.coords.latitude,
      raw.coords.longitude,
      arrivedThreshold,
    ].every(Number.isFinite) ||
    accuracy == null ||
    !Number.isFinite(accuracy) ||
    accuracy < 0 ||
    raw.coords.accuracy == null ||
    !Number.isFinite(raw.coords.accuracy) ||
    raw.coords.accuracy < 0
  )
    return null;
  return isPointWithinRadius(
    { latitude, longitude },
    { latitude: station.latitude, longitude: station.longitude },
    arrivedThreshold + getAccuracyBonus(accuracy)
  )
    ? station.id
    : null;
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
    /** Automatic departure estimates are not ground-truth labels. */
    departureSource?: 'imu' | 'location';
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

// The recording may survive the panel that stopped it. Keep the final
// observation associated with the recording, not the current component.
const finalBatteryObservations = new WeakMap<Recording, Promise<void>>();
export const rememberFinalBatteryObservation = (
  recording: Recording,
  pending: Promise<void>
): void => {
  finalBatteryObservations.set(recording, pending);
};

export const waitForFinalBatteryObservation = async (
  recording: Recording
): Promise<void> => {
  await finalBatteryObservations.get(recording);
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
      item.reference.locationArrivalStationId != null &&
      targetIds.includes(item.reference.locationArrivalStationId)
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
    departureSource: departure ? (departure.departureSource ?? 'manual') : null,
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
