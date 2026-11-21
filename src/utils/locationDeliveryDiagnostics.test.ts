import type * as Location from 'expo-location';
import {
  beginLocationDelivery,
  getLocationDeliveryDiagnostics,
  recordLocationTaskError,
  resetLocationDeliveryDiagnostics,
} from './locationDeliveryDiagnostics';

const sample = {
  sessionId: 'native-session',
  sampleId: '1',
  taskName: 'location',
  source: 'recovery',
  sampleTimestampMs: 1000.25,
  accuracy: 20,
  receivedAtMs: 1200,
  receivedUptimeMs: 200,
  receivedInBackground: true,
  dispatchedAtMs: 2000,
  dispatchedUptimeMs: 1000,
  dispatchedInBackground: true,
  batchSize: 1,
  batchIndex: 0,
};
const location = (metadata: unknown = sample) =>
  ({
    timestamp: 1000.25,
    coords: { latitude: 35, longitude: 139, accuracy: 20 },
    trainLCDDiagnostic: metadata,
  }) as unknown as Location.LocationObject;

beforeEach(resetLocationDeliveryDiagnostics);
afterEach(() => jest.restoreAllMocks());

it('keeps native timestamps and IDs through a delayed JS receipt and result', () => {
  jest.spyOn(Date, 'now').mockReturnValue(9000);
  const finish = beginLocationDelivery(location(), 'task');
  jest.spyOn(Date, 'now').mockReturnValue(9001);
  finish('rejectedByAccuracy');
  expect(getLocationDeliveryDiagnostics().recent[0]).toMatchObject({
    receivedAtMs: 9000,
    completedAtMs: 9001,
    sampleTimestampMs: 1000.25,
    source: 'task',
    outcome: 'rejectedByAccuracy',
    native: sample,
  });
});

it('does not collapse repeated timestamps into one delivery', () => {
  beginLocationDelivery(location(), 'task')('accepted');
  beginLocationDelivery(
    location({ ...sample, sampleId: '2' }),
    'task'
  )('rejectedAsDuplicate');
  const records = getLocationDeliveryDiagnostics().recent;
  expect(records.map((r) => r.native?.sampleId)).toEqual(['1', '2']);
  expect(records.map((r) => r.sequence)).toEqual([1, 2]);
});

it('limits history and keeps the lifetime input count', () => {
  for (let i = 0; i < 100; i++)
    beginLocationDelivery(location(), 'watch')('accepted');
  expect(getLocationDeliveryDiagnostics().received).toBe(100);
  expect(getLocationDeliveryDiagnostics().recent).toHaveLength(40);
  expect(getLocationDeliveryDiagnostics().recent[0].sequence).toBe(61);
});

it.each([
  undefined,
  null,
  {},
  { ...sample, receivedAtMs: Number.NaN },
  { ...sample, source: 'unknown' },
])(
  'rejects incomplete metadata without losing the JS result (%p)',
  (metadata) => {
    beginLocationDelivery(
      location(metadata === undefined ? null : metadata),
      'watch'
    )('accepted');
    expect(getLocationDeliveryDiagnostics().recent[0]).toMatchObject({
      outcome: 'accepted',
      native: null,
    });
  }
);

it('copies snapshots and strips coordinates from metadata', () => {
  beginLocationDelivery(
    location({ ...sample, latitude: 35, longitude: 139 }),
    'task'
  )('accepted');
  const snapshot = getLocationDeliveryDiagnostics();
  expect(snapshot.recent[0].native).not.toHaveProperty('latitude');
  snapshot.recent[0].outcome = 'error';
  if (snapshot.recent[0].native) snapshot.recent[0].native.sampleId = 'changed';
  expect(getLocationDeliveryDiagnostics().recent[0]).toMatchObject({
    outcome: 'accepted',
    native: { sampleId: '1' },
  });
});

it('bounds task errors, counts all failures and excludes arbitrary error payloads', () => {
  for (let i = 0; i < 45; i++) recordLocationTaskError({ code: i });
  const snapshot = getLocationDeliveryDiagnostics();
  expect(snapshot.taskErrorCount).toBe(45);
  expect(snapshot.taskErrors).toHaveLength(40);
  expect(snapshot.taskErrors[0].code).toBe(5);
  snapshot.taskErrors[0].code = 'changed';
  expect(getLocationDeliveryDiagnostics().taskErrors[0].code).toBe(5);
  resetLocationDeliveryDiagnostics();
  expect(getLocationDeliveryDiagnostics().taskErrorCount).toBe(0);
});
