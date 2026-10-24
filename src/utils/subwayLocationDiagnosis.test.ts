import type * as Location from 'expo-location';
import getDistance from 'geolib/es/getDistance';
import isPointWithinRadius from 'geolib/es/isPointWithinRadius';
import { Platform } from 'react-native';
import { LineType, type Station } from '~/@types/graphql';
import { store } from '~/store';
import { etaAnchorAtom, etaStopsAtom } from '~/store/atoms/etaFallback';
import {
  accuracyHistoryAtom,
  locationAtom,
  resetLocationState,
  smoothingDecisionAtom,
} from '~/store/atoms/location';
import stationState from '~/store/atoms/station';
import { getAccuracyBonus } from './accuracyBonus';
import {
  handleTrackingLocation,
  resetTrackingLocationDedup,
} from './handleTrackingLocation';
import { getLocationPipelineCounts } from './locationPipelineStats';

jest.mock('~/lib/remoteConfig', () => ({
  getMaxPermitAccuracy: () => 3000,
  isEtaAssistEnabled: () => true,
  getEtaFallbackArrivalConfirmMarginSec: () => 0,
}));

// Regression: the last fix is supplied by the user. Earlier station-center
// fixes below are synthetic, not a reconstruction of the missing raw history.
const timestamp = 1792626526878.646;
const kasugacho = {
  id: 9930137,
  latitude: 35.751452,
  longitude: 139.640236,
  line: { lineType: LineType.Subway },
} as Station & { id: number; latitude: number; longitude: number };
const toshimaen = {
  id: 9930136,
  latitude: 35.742567043044,
  longitude: 139.64894845621,
  line: { lineType: LineType.Subway },
} as Station & { id: number; latitude: number; longitude: number };
const fix = (
  latitude: number,
  longitude: number,
  time: number
): Location.LocationObject => ({
  coords: {
    latitude,
    longitude,
    accuracy: 2000,
    speed: -1,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
  },
  timestamp: time,
});
const reported = fix(35.7482968925073, 139.6411520672503, timestamp);

describe('iOS coarse location regression (synthetic history)', () => {
  const originalOS = Platform.OS;
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    resetLocationState();
    resetTrackingLocationDedup();
    store.set(stationState, (prev) => ({
      ...prev,
      station: kasugacho,
      stations: [kasugacho, toshimaen],
    }));
    store.set(etaAnchorAtom, {
      stationId: kasugacho.id,
      kind: 'DEPARTED',
      observedAtMs: timestamp - 18082.421,
    });
    store.set(etaStopsAtom, [
      {
        stationId: kasugacho.id,
        cumulativeMinutes: 0,
        departureCumulativeMinutes: 0,
      },
      {
        stationId: toshimaen.id,
        cumulativeMinutes: 2,
        departureCumulativeMinutes: 2.5,
      },
    ]);
  });
  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      value: originalOS,
      configurable: true,
    });
    store.set(etaAnchorAtom, null);
    store.set(etaStopsAtom, []);
    resetLocationState();
    resetTrackingLocationDedup();
  });

  it.each(['ios', 'android'] as const)(
    '%s accepts the reported fix unchanged and it is outside the arrival radius',
    (os) => {
      Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
      handleTrackingLocation(reported);
      expect(store.get(locationAtom)).toBe(reported);
      expect(store.get(smoothingDecisionAtom).skipSmoothing).toBe(
        os === 'android'
      );
      expect(getDistance(reported.coords, kasugacho, 0.01)).toBeCloseTo(
        360.84,
        2
      );
      expect(200 + getAccuracyBonus(2000)).toBe(350);
      expect(isPointWithinRadius(reported.coords, kasugacho, 350)).toBe(false);
      expect(getLocationPipelineCounts()).toEqual({
        accepted: 1,
        rejectedByAccuracy: 0,
        rejectedAsDuplicate: 0,
        rejectedByEta: 0,
        rejectedBySpeed: 0,
      });
    }
  );

  it.each(['ios', 'android'] as const)(
    '%s uses the same 1500m entry and stable-history recovery for every line type',
    (os) => {
      Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
      store.set(etaAnchorAtom, null);
      store.set(etaStopsAtom, []);
      const replay = (lineType: LineType | null) => {
        resetLocationState();
        resetTrackingLocationDedup();
        store.set(stationState, (prev) => ({
          ...prev,
          station: lineType
            ? ({ ...kasugacho, line: { lineType } } as Station)
            : null,
        }));
        const accuracies = [
          30,
          30,
          30,
          30,
          1499,
          1500,
          1501,
          ...Array<number>(13).fill(500),
          ...Array<number>(12).fill(30),
        ];
        return accuracies.map((accuracy, index) => {
          const location = fix(
            kasugacho.latitude + index * 0.00001,
            kasugacho.longitude,
            timestamp + index * 10000
          );
          location.coords.accuracy = accuracy;
          handleTrackingLocation(location);
          return {
            location: store.get(locationAtom),
            skip: store.get(smoothingDecisionAtom).skipSmoothing,
            history: store.get(accuracyHistoryAtom),
            counts: getLocationPipelineCounts(),
          };
        });
      };
      const subway = replay(LineType.Subway);
      expect(replay(LineType.Normal)).toEqual(subway);
      expect(replay(null)).toEqual(subway);
      expect(subway.slice(0, 5).every((point) => !point.skip)).toBe(true);
      expect(subway[5].skip).toBe(true); // 1500m is inclusive.
      expect(subway[6].skip).toBe(os === 'android'); // Existing iOS coarse filter.
      expect(subway[19].history).not.toContain(1500);
      expect(subway[19].skip).toBe(true); // Poor precision has not recovered.
      expect(subway.at(-1)?.skip).toBe(false);
      expect(subway.at(-1)?.history).toEqual(Array(12).fill(30));
      resetLocationState();
      resetTrackingLocationDedup();
      const fresh = fix(kasugacho.latitude, kasugacho.longitude, timestamp);
      fresh.coords.accuracy = 500;
      handleTrackingLocation(fresh);
      expect(store.get(smoothingDecisionAtom).skipSmoothing).toBe(false);
    }
  );

  it('rejects a synthetic 1.26km jump in one second inside the ETA envelope', () => {
    handleTrackingLocation(
      fix(kasugacho.latitude, kasugacho.longitude, timestamp - 1000)
    );
    const jump = fix(toshimaen.latitude, toshimaen.longitude, timestamp);
    handleTrackingLocation(jump);
    expect(store.get(locationAtom)?.coords.latitude).toBe(kasugacho.latitude);
    expect(getLocationPipelineCounts()).toMatchObject({
      accepted: 1,
      rejectedBySpeed: 1,
      rejectedByEta: 0,
    });
  });

  it('keeps the synthetic station fix inside the arrival radius after the reported coarse jitter', () => {
    const center = fix(
      kasugacho.latitude,
      kasugacho.longitude,
      timestamp - 10000
    );
    handleTrackingLocation(center);
    expect(
      isPointWithinRadius(
        (store.get(locationAtom) as Location.LocationObject).coords,
        kasugacho,
        350
      )
    ).toBe(true);
    handleTrackingLocation(reported);
    expect(
      isPointWithinRadius(
        (store.get(locationAtom) as Location.LocationObject).coords,
        kasugacho,
        350
      )
    ).toBe(true);
  });

  it('Android continues to adopt coarse station-to-station measurements directly', () => {
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
    });
    handleTrackingLocation(
      fix(kasugacho.latitude, kasugacho.longitude, timestamp - 1000)
    );
    const next = fix(toshimaen.latitude, toshimaen.longitude, timestamp);
    handleTrackingLocation(next);
    expect(store.get(locationAtom)).toBe(next);
  });

  it('immediately adopts a recovered accurate station fix after coarse measurements', () => {
    handleTrackingLocation(
      fix(kasugacho.latitude, kasugacho.longitude, timestamp - 1000)
    );
    const recovered = fix(toshimaen.latitude, toshimaen.longitude, timestamp);
    recovered.coords.accuracy = 30;
    handleTrackingLocation(recovered);
    expect(store.get(locationAtom)).toBe(recovered);
    expect(getLocationPipelineCounts().rejectedBySpeed).toBe(0);
  });

  it('uses the recovered station as the reference for subsequent coarse jitter', () => {
    const center = fix(
      kasugacho.latitude,
      kasugacho.longitude,
      timestamp - 10000
    );
    center.coords.accuracy = 30;
    handleTrackingLocation(center);
    handleTrackingLocation(reported);
    const result = store.get(locationAtom) as Location.LocationObject;
    expect(getDistance(result.coords, kasugacho)).toBeLessThan(350);
    expect(result.timestamp).toBe(reported.timestamp);
  });

  it('recovers after five consecutive speed rejections instead of freezing', () => {
    handleTrackingLocation(
      fix(kasugacho.latitude, kasugacho.longitude, timestamp)
    );
    let next = reported;
    for (let i = 1; i <= 5; i++) {
      next = fix(toshimaen.latitude, toshimaen.longitude, timestamp + i * 1000);
      handleTrackingLocation(next);
    }
    expect(store.get(locationAtom)).toBe(next);
    expect(getLocationPipelineCounts().rejectedBySpeed).toBe(4);
  });

  it('continues moving toward the next station with repeated coarse measurements', () => {
    handleTrackingLocation(
      fix(kasugacho.latitude, kasugacho.longitude, timestamp)
    );
    for (let i = 1; i <= 12; i++) {
      const fraction = i / 12;
      handleTrackingLocation(
        fix(
          kasugacho.latitude +
            (toshimaen.latitude - kasugacho.latitude) * fraction,
          kasugacho.longitude +
            (toshimaen.longitude - kasugacho.longitude) * fraction,
          timestamp + i * 10000
        )
      );
    }
    const result = store.get(locationAtom) as Location.LocationObject;
    expect(isPointWithinRadius(result.coords, toshimaen, 350)).toBe(true);
    expect(isPointWithinRadius(result.coords, kasugacho, 350)).toBe(false);
  });

  it('adopts the recovered accurate fix after a line type transition', () => {
    handleTrackingLocation(
      fix(kasugacho.latitude, kasugacho.longitude, timestamp)
    );
    store.set(stationState, (prev) => ({
      ...prev,
      station: {
        ...toshimaen,
        line: { ...toshimaen.line, lineType: LineType.Normal },
      } as Station,
    }));
    const surface = fix(
      toshimaen.latitude,
      toshimaen.longitude,
      timestamp + 1000
    );
    surface.coords.accuracy = 20;
    handleTrackingLocation(surface);
    expect(store.get(locationAtom)).toBe(surface);
  });

  it.each([1500, 1501])(
    'only smooths the band above the existing 1500m limit (%i)',
    (accuracy) => {
      const center = fix(
        kasugacho.latitude,
        kasugacho.longitude,
        timestamp - 10000
      );
      center.coords.accuracy = 30;
      handleTrackingLocation(center);
      const next = { ...reported, coords: { ...reported.coords, accuracy } };
      handleTrackingLocation(next);
      expect(store.get(smoothingDecisionAtom).skipSmoothing).toBe(
        accuracy === 1500
      );
      if (accuracy === 1500) {
        expect(store.get(locationAtom)).toBe(next);
      } else {
        expect(
          getDistance(
            (store.get(locationAtom) as Location.LocationObject).coords,
            kasugacho
          )
        ).toBeLessThan(350);
      }
    }
  );

  it.each([LineType.Normal, LineType.Subway, null])(
    'smooths coarse iOS fixes and recovers accurate fixes regardless of line type (%s)',
    (lineType) => {
      store.set(stationState, (prev) => ({
        ...prev,
        station: {
          ...kasugacho,
          line: lineType ? { lineType } : null,
        } as Station,
      }));
      const center = fix(
        kasugacho.latitude,
        kasugacho.longitude,
        timestamp - 10000
      );
      center.coords.accuracy = 30;
      handleTrackingLocation(center);
      handleTrackingLocation(reported);
      expect(store.get(smoothingDecisionAtom).skipSmoothing).toBe(false);
      expect(
        getDistance(
          (store.get(locationAtom) as Location.LocationObject).coords,
          kasugacho
        )
      ).toBeLessThan(350);
      const recovered = fix(
        toshimaen.latitude,
        toshimaen.longitude,
        timestamp + 1000
      );
      recovered.coords.accuracy = 30;
      handleTrackingLocation(recovered);
      expect(store.get(locationAtom)).toBe(recovered);
    }
  );

  it('keeps smoothing coarse measurements when the line type changes', () => {
    handleTrackingLocation(
      fix(kasugacho.latitude, kasugacho.longitude, timestamp - 10000)
    );
    store.set(stationState, (prev) => ({
      ...prev,
      station: { ...kasugacho, line: { lineType: LineType.Normal } } as Station,
    }));
    handleTrackingLocation(reported);
    expect(store.get(locationAtom)).not.toBe(reported);
    expect(
      getDistance(
        (store.get(locationAtom) as Location.LocationObject).coords,
        kasugacho
      )
    ).toBeLessThan(350);
  });
});
