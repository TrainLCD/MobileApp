import {
  getLegComparison,
  getLocationArrivalStationId,
  isManualCorrectionActive,
  type Recording,
  type Reference,
} from './imuShadowRecording';

const reference: Reference = {
  stationId: 1,
  arrived: false,
  locationArrivalStationId: null,
  rawLocationTimeMs: null,
  rawAccuracyM: null,
  rawSpeedMps: null,
  filteredLocationTimeMs: null,
  etaPhase: null,
  etaAnchor: null,
};
const makeRecording = (): Recording => ({
  schemaVersion: 1,
  mode: 'imu',
  appVersion: null,
  buildNumber: null,
  platform: 'ios',
  osVersion: 1,
  startedAtMs: 0,
  endedAtMs: 60_000,
  endReason: 'manual-stop',
  stops: [],
  legs: [
    {
      startedAtMs: 0,
      leg: {
        fromId: 1,
        toId: 2,
        toAliases: [3],
        distanceM: 500,
        etaSeconds: 40,
        missingPairs: [],
      },
    },
  ],
  motion: [],
  observations: [],
  events: [],
  battery: [],
});
const event = (
  atMs: number,
  kind: Recording['events'][number]['kind']
): Recording['events'][number] => ({
  atMs,
  kind,
  legIndex: 0,
  stationId: kind === 'departure' ? 1 : 2,
  estimate: null,
  reference,
});

test('compares the independent ground truth, ETA and late/early candidates', () => {
  const recording = makeRecording();
  recording.events.push(
    event(5000, 'departure'),
    event(25_000, 'candidate'),
    event(50_000, 'arrival'),
    event(52_000, 'candidate')
  );
  recording.observations.push({
    atMs: 46_000,
    legIndex: 0,
    estimate: null,
    reference: { ...reference, etaPhase: { kind: 'DWELLING', stationId: 3 } },
  });
  const comparison = getLegComparison(recording, 0);
  expect(comparison?.etaErrorSeconds).toBe(-5);
  expect(comparison?.existingEtaErrorSeconds).toBe(-4);
  expect(comparison?.candidateErrorsSeconds).toEqual([-25, 2]);
  expect(comparison?.falseCandidateCount).toBe(1);
  expect(comparison?.missedCandidate).toBe(false);
});

test('a far-too-early candidate counts as a false detection and a miss', () => {
  const recording = makeRecording();
  recording.events.push(
    event(5000, 'departure'),
    event(20_000, 'candidate'),
    event(50_000, 'arrival')
  );
  const comparison = getLegComparison(recording, 0);
  expect(comparison?.falseCandidateCount).toBe(1);
  expect(comparison?.missedCandidate).toBe(true);
});

test('does not count missing ground truth or baseline mode as a missed detection', () => {
  const recording = makeRecording();
  expect(getLegComparison(recording, 0)?.missedCandidate).toBeNull();
  recording.mode = 'baseline';
  recording.events.push(event(50_000, 'arrival'));
  expect(getLegComparison(recording, 0)?.missedCandidate).toBeNull();
});

test('does not label the shared arrival state as a GPS detection without coordinate evidence', () => {
  const recording = makeRecording();
  recording.events.push(event(50_000, 'arrival'));
  const observe = (atMs: number, locationArrivalStationId: number | null) => ({
    atMs,
    legIndex: 0,
    estimate: null,
    reference: {
      ...reference,
      arrived: true,
      stationId: 2,
      locationArrivalStationId,
    },
  });
  recording.observations.push(
    observe(30_000, null),
    observe(40_000, 1),
    observe(48_000, 3)
  );
  expect(getLegComparison(recording, 0)?.gpsArrivalAtMs).toBe(48_000);
  expect(getLegComparison(recording, 0)?.gpsErrorSeconds).toBe(-2);
  recording.observations.pop();
  expect(getLegComparison(recording, 0)?.gpsArrivalAtMs).toBeNull();
});

test('requires recent accepted position evidence, not stale or corrected arrival state', () => {
  const coords = {
    latitude: 35,
    longitude: 139,
    accuracy: 10,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
  };
  const location = { timestamp: 40_000, coords };
  const input = {
    raw: location,
    filtered: location,
    station: { id: 2, latitude: 35, longitude: 139 },
    arrived: true,
    manualCorrection: false,
    arrivedThreshold: 100,
    atMs: 41_000,
    legStartedAtMs: 10_000,
  };
  expect(getLocationArrivalStationId(input)).toBe(2);
  const stations = [input.station];
  const correction = { location, stations };
  expect(
    getLocationArrivalStationId({
      ...input,
      manualCorrection: isManualCorrectionActive(
        correction,
        location,
        stations
      ),
    })
  ).toBeNull();
  const nextLocation = { ...location, timestamp: 40_500 };
  expect(
    getLocationArrivalStationId({
      ...input,
      raw: nextLocation,
      filtered: nextLocation,
      manualCorrection: isManualCorrectionActive(
        correction,
        nextLocation,
        stations
      ),
    })
  ).toBe(2);
  expect(isManualCorrectionActive(correction, location, [...stations])).toBe(
    false
  );
  expect(
    getLocationArrivalStationId({
      ...input,
      station: { ...input.station, id: null },
    })
  ).toBeNull();
  expect(getLocationArrivalStationId({ ...input, atMs: 39_999 })).toBeNull();
  expect(getLocationArrivalStationId({ ...input, raw: null })).toBeNull();
  expect(getLocationArrivalStationId({ ...input, filtered: null })).toBeNull();
  expect(
    getLocationArrivalStationId({
      ...input,
      raw: { ...location, timestamp: 40_500 },
    })
  ).toBeNull();
  expect(getLocationArrivalStationId({ ...input, atMs: 50_001 })).toBeNull();
  expect(
    getLocationArrivalStationId({ ...input, legStartedAtMs: 40_001 })
  ).toBeNull();
  expect(
    getLocationArrivalStationId({ ...input, manualCorrection: true })
  ).toBeNull();
  expect(getLocationArrivalStationId({ ...input, arrived: false })).toBeNull();
  expect(
    getLocationArrivalStationId({
      ...input,
      station: { id: 2, latitude: null, longitude: 139 },
    })
  ).toBeNull();
  expect(
    getLocationArrivalStationId({
      ...input,
      station: { id: 2, latitude: 36, longitude: 139 },
    })
  ).toBeNull();
});

test('exposes the source of an inferred departure, rather than labeling it ground truth', () => {
  const recording = makeRecording();
  recording.events.push(
    { ...event(5000, 'departure'), departureSource: 'imu' },
    event(50_000, 'arrival')
  );
  expect(getLegComparison(recording, 0)).toMatchObject({
    departureSource: 'imu',
    etaErrorSeconds: -5,
  });
});
