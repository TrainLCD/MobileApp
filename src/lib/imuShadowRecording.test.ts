import {
  getLegComparison,
  type Recording,
  type Reference,
} from './imuShadowRecording';

const reference: Reference = {
  stationId: 1,
  arrived: false,
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
