import type * as Location from 'expo-location';
import { Platform } from 'react-native';
import { store } from '~/store';
import { locationAtom, resetLocationState } from '~/store/atoms/location';
import stationState from '~/store/atoms/station';
import { handleLocationTaskBatch } from './handleLocationTaskBatch';
import {
  handleTrackingLocation,
  resetTrackingLocationDedup,
} from './handleTrackingLocation';
import {
  getLocationDeliveryDiagnostics,
  resetLocationDeliveryDiagnostics,
} from './locationDeliveryDiagnostics';
import { getLocationPipelineCounts } from './locationPipelineStats';

jest.mock('~/lib/remoteConfig', () => ({
  getMaxPermitAccuracy: () => 3000,
  isEtaAssistEnabled: () => false,
}));
const fix = (
  timestamp: number,
  accuracy = 20,
  latitude = 35
): Location.LocationObject => ({
  timestamp,
  coords: {
    latitude,
    longitude: 139,
    accuracy,
    speed: -1,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
  },
});
const originalOS = Platform.OS;
beforeEach(() => {
  Platform.OS = 'ios';
  resetLocationState();
  resetTrackingLocationDedup();
  resetLocationDeliveryDiagnostics();
  store.set(stationState, (prev) => ({ ...prev, station: null, stations: [] }));
});
afterEach(() => {
  Platform.OS = originalOS;
});

it('preserves the batch tail policy and records excluded samples separately from filter rejections', () => {
  handleLocationTaskBatch([fix(1000), fix(2000)]);
  expect(store.get(locationAtom)?.timestamp).toBe(2000);
  expect(getLocationDeliveryDiagnostics().recent.map((r) => r.outcome)).toEqual(
    ['not-selected', 'accepted']
  );
  expect(getLocationPipelineCounts()).toMatchObject({
    accepted: 1,
    rejectedAsDuplicate: 0,
  });
});

it('records actual duplicate, accuracy and speed outcomes without changing the accepted position', () => {
  handleLocationTaskBatch([fix(1000)]);
  handleLocationTaskBatch([fix(1000)]);
  handleLocationTaskBatch([fix(2000, 4000)]);
  handleLocationTaskBatch([fix(3000, 20, 36)]);
  expect(getLocationDeliveryDiagnostics().recent.map((r) => r.outcome)).toEqual(
    ['accepted', 'rejectedAsDuplicate', 'rejectedByAccuracy', 'rejectedBySpeed']
  );
  expect(store.get(locationAtom)?.timestamp).toBe(1000);
  expect(getLocationPipelineCounts()).toMatchObject({
    accepted: 1,
    rejectedAsDuplicate: 1,
    rejectedByAccuracy: 1,
    rejectedBySpeed: 1,
  });
});

it('records the foreground heartbeat separately and accepts old binaries without metadata', () => {
  handleTrackingLocation(fix(1000), 'foreground-heartbeat');
  expect(getLocationDeliveryDiagnostics().recent[0]).toMatchObject({
    source: 'foreground-heartbeat',
    native: null,
    outcome: 'accepted',
  });
});

it('an empty task batch neither changes position nor invents a receipt', () => {
  handleLocationTaskBatch([]);
  expect(getLocationDeliveryDiagnostics().received).toBe(0);
  expect(store.get(locationAtom)).toBeNull();
});

it('does not carry native diagnostic transport metadata into application state', () => {
  const location = { ...fix(1000), trainLCDDiagnostic: { sampleId: '1' } };
  handleLocationTaskBatch([location]);
  expect(store.get(locationAtom)).not.toHaveProperty('trainLCDDiagnostic');
  expect(location.trainLCDDiagnostic).toEqual({ sampleId: '1' });
});
