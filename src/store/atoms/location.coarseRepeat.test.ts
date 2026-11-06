import type * as Location from 'expo-location';
import getDistance from 'geolib/es/getDistance';
import { Platform } from 'react-native';
import { LineType, type Station } from '~/@types/graphql';
import {
  handleTrackingLocation,
  resetTrackingLocationDedup,
} from '~/utils/handleTrackingLocation';
import { getLocationPipelineCounts } from '~/utils/locationPipelineStats';
import { store } from '..';
import { etaAnchorAtom, etaStopsAtom } from './etaFallback';
import { locationAtom, resetLocationState } from './location';
import stationState from './station';

jest.mock('~/lib/remoteConfig', () => ({
  getMaxPermitAccuracy: () => 3000,
  isEtaAssistEnabled: () => true,
  getEtaFallbackArrivalConfirmMarginSec: () => 30,
}));

const origin = { latitude: 35, longitude: 139 };
const fix = (meters: number, timestamp: number, accuracy = 2000) =>
  ({
    timestamp,
    coords: {
      latitude: origin.latitude + meters / 111_320,
      longitude: origin.longitude,
      accuracy,
      speed: -1,
      heading: null,
      altitude: null,
      altitudeAccuracy: null,
    },
  }) as Location.LocationObject;
const feed = (meters: number, seconds: number, accuracy = 2000) =>
  handleTrackingLocation(fix(meters, 1_000_000 + seconds * 1000, accuracy));
const distanceFrom = (location: Location.LocationObject) => {
  const shown = store.get(locationAtom);
  if (!shown) throw new Error('No accepted location');
  return getDistance(shown.coords, location.coords);
};
const originalOS = Platform.OS;

beforeEach(() => {
  Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
  resetLocationState();
  resetTrackingLocationDedup();
  store.set(stationState, (prev) => ({ ...prev, station: null, stations: [] }));
  store.set(etaAnchorAtom, null);
  store.set(etaStopsAtom, []);
});
afterEach(() => {
  Object.defineProperty(Platform, 'OS', { value: originalOS });
  resetLocationState();
  resetTrackingLocationDedup();
  jest.clearAllMocks();
});

it.each([LineType.Subway, LineType.Normal, null])(
  'reduces lag when coarse raw coordinates repeat away from any station (%s)',
  (lineType) => {
    store.set(stationState, (prev) => ({
      ...prev,
      station: lineType ? ({ line: { lineType } } as Station) : null,
    }));
    // Timestamps and rounded displacements (1195, 0, 1, 339m) are from samples
    // 70, 72, 73, 75, 76 in the supplied dump. Coordinates/directions are synthetic:
    // the dump does not contain those older raw coordinates.
    handleTrackingLocation(fix(0, 1793922053799.1199));
    handleTrackingLocation(fix(1195, 1793922076415.903));
    handleTrackingLocation(fix(1195, 1793922076420.6829));
    const repeated = fix(1196, 1793922099951.6357, 2355.953263853201);
    handleTrackingLocation(repeated);
    expect(distanceFrom(repeated)).toBeLessThan(60);
    const accepted = store.get(locationAtom);
    handleTrackingLocation(fix(1535, 1793922100213.0662, 2355.999909863263));
    expect(store.get(locationAtom)).toBe(accepted);
    expect(getLocationPipelineCounts().rejectedBySpeed).toBe(1);
  }
);

it('keeps a single plausible coarse spike inside the platform arrival radius', () => {
  feed(0, 0);
  feed(1000, 20);
  expect(distanceFrom(fix(0, 0))).toBeLessThan(350);
  feed(0, 40);
  expect(distanceFrom(fix(0, 0))).toBeLessThan(350);
});

it('keeps a platform position inside its arrival radius through alternating jitter', () => {
  feed(0, 0);
  for (let i = 1; i <= 60; i++) {
    feed(i % 2 ? 360 : -360, i * 10);
    expect(distanceFrom(fix(0, 0))).toBeLessThan(350);
  }
});

it.each([0.25, 1])(
  'keeps the existing coefficient for a %ss repeat',
  (interval) => {
    feed(0, 0);
    feed(1195, 20);
    feed(1195, 20 + interval);
    expect(distanceFrom(fix(1195, 0))).toBeGreaterThan(500);
  }
);

it.each([0, 1])(
  'reduces lag for a repeated raw displacement of %sm',
  (meters) => {
    feed(0, 0);
    feed(1195, 20);
    feed(1195 + meters, 40);
    expect(distanceFrom(fix(1195 + meters, 0))).toBeLessThan(90);
  }
);

it('keeps filtering coarse movement that exceeds the one-meter repeat tolerance', () => {
  feed(0, 0);
  feed(1195, 20);
  feed(1197, 40);
  expect(distanceFrom(fix(1197, 0))).toBeGreaterThan(500);
});

it('preserves the existing 200–1500m low-accuracy smoothing', () => {
  feed(0, 0, 300);
  feed(1195, 20, 300);
  feed(1195, 40, 300);
  expect(distanceFrom(fix(1195, 0))).toBeGreaterThan(500);
});

it('does not confirm a repeat using a speed-rejected raw coordinate', () => {
  feed(0, 0);
  feed(1195, 1);
  feed(1195, 20);
  expect(distanceFrom(fix(1195, 0))).toBeGreaterThan(800);
  expect(getLocationPipelineCounts().rejectedBySpeed).toBe(1);
});
