import type * as Location from 'expo-location';
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

const t = 1_000_000;
const fix = (
  latitude: number,
  seconds: number,
  accuracy = 30
): Location.LocationObject => ({
  timestamp: t + seconds * 1000,
  coords: {
    latitude,
    longitude: 139,
    accuracy,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
  },
});
const feed = (latitude: number, seconds: number, accuracy = 30) =>
  handleTrackingLocation(fix(latitude, seconds, accuracy));
const seed = (latitude: number) => {
  for (let i = -3; i <= 0; i++) feed(latitude, i);
};
const originalOS = Platform.OS;

afterAll(() => Object.defineProperty(Platform, 'OS', { value: originalOS }));

describe.each(['ios', 'android'] as const)('%s underground recovery', (os) => {
  describe.each([LineType.Normal, LineType.Subway, null])(
    'line %s',
    (lineType) => {
      beforeEach(() => {
        Object.defineProperty(Platform, 'OS', {
          configurable: true,
          value: os,
        });
        resetLocationState();
        resetTrackingLocationDedup();
        store.set(etaAnchorAtom, null);
        store.set(etaStopsAtom, []);
        store.set(stationState, (prev) => ({
          ...prev,
          station:
            lineType == null ? null : ({ line: { lineType } } as Station),
          stations: [],
        }));
      });

      it('recovers at the end of a consistent sequence and resumes the speed filter', () => {
        seed(35);
        feed(35, 1, 1500);
        for (let i = 1; i <= 12; i++) feed(35.1 + i * 0.00001, i + 1);
        expect(store.get(locationAtom)?.coords.latitude).toBeCloseTo(
          35.10012,
          5
        );
        expect(getLocationPipelineCounts().rejectedBySpeed).toBe(0);
        const before = store.get(locationAtom);
        feed(36.1, 14);
        expect(store.get(locationAtom)).toBe(before);
        expect(getLocationPipelineCounts().rejectedBySpeed).toBe(1);
        feed(35.10013, 15);
        expect(store.get(locationAtom)?.coords.latitude).toBeGreaterThan(
          35.10012
        );
      });

      it('rejects a 111km jump on the first normal-filter fix', () => {
        seed(35);
        feed(35, 1, 1500);
        for (let i = 1; i <= 11; i++) feed(35.1 + i * 0.00001, i + 1);
        const before = store.get(locationAtom);
        feed(36.10012, 13);
        expect(store.get(locationAtom)).toBe(before);
        expect(getLocationPipelineCounts().rejectedBySpeed).toBe(1);
        feed(35.10013, 14);
        feed(35.10014, 15);
        expect(store.get(locationAtom)?.coords.latitude).toBeCloseTo(
          35.10014,
          5
        );
      });

      it('keeps the trusted candidate when nearby abnormal fixes repeat', () => {
        seed(35);
        feed(35, 1, 1500);
        for (let i = 1; i <= 11; i++) feed(35.1 + i * 0.00001, i + 1);
        const before = store.get(locationAtom);
        for (let i = 0; i < 6; i++) {
          feed(36.1 + i * 0.00001, 13 + i);
          expect(store.get(locationAtom)).toBe(before);
        }
        expect(getLocationPipelineCounts().rejectedBySpeed).toBe(6);
        feed(35.10013, 19);
        expect(store.get(locationAtom)).toEqual(fix(35.10013, 19));
        feed(36.1, 20);
        expect(store.get(locationAtom)).toEqual(fix(35.10013, 19));
      });

      it.each([200, 201, null, Number.NaN, -1])(
        'holds accuracy %s during confirmation without replacing the trusted candidate',
        (accuracy) => {
          seed(35);
          feed(35, 1, 1500);
          for (let i = 1; i <= 11; i++) feed(35.1 + i * 0.00001, i + 1, 190);
          const before = store.get(locationAtom);
          // 200mで地下向け履歴から抜け、その点も確認前には反映しない。
          feed(35.10012, 13, 200);
          expect(store.get(locationAtom)).toBe(before);
          for (let i = 0; i < 5; i++) {
            const location = fix(36.1, 14 + i);
            location.coords.accuracy = accuracy;
            handleTrackingLocation(location);
            expect(store.get(locationAtom)).toBe(before);
          }
          expect(getLocationPipelineCounts()).toMatchObject({
            accepted: 16,
            rejectedByAccuracy: 6,
            rejectedBySpeed: 0,
          });
          // 精度不足を挟んでも、異常座標を新たな候補として採用しない。
          feed(36.1, 19);
          feed(36.10001, 20);
          expect(store.get(locationAtom)).toBe(before);
          feed(35.10013, 21);
          expect(store.get(locationAtom)).toEqual(fix(35.10013, 21));
        }
      );

      it.each([30, 60])(
        'recovers with a %s-second delivery interval',
        (interval) => {
          seed(35);
          feed(35, 1, 1500);
          for (let i = 1; i <= 12; i++)
            feed(35.1 + i * 0.00001, 1 + i * interval);
          expect(store.get(locationAtom)).toEqual(
            fix(35.1 + 12 * 0.00001, 1 + 12 * interval)
          );
          expect(getLocationPipelineCounts().rejectedBySpeed).toBe(0);
        }
      );

      it('clears pending confirmation on reset', () => {
        seed(35);
        feed(35, 1, 1500);
        for (let i = 1; i <= 11; i++) feed(35.1 + i * 0.00001, i + 1);
        feed(36.1, 13);
        resetLocationState();
        resetTrackingLocationDedup();
        feed(34, 14);
        expect(store.get(locationAtom)?.coords.latitude).toBe(34);
        feed(35.1, 15);
        expect(store.get(locationAtom)?.coords.latitude).toBe(34);
        expect(getLocationPipelineCounts().rejectedBySpeed).toBe(1);
      });

      it('does not resync merely after five inconsistent recovery candidates', () => {
        seed(35);
        feed(35, 1, 1500);
        for (let i = 1; i <= 11; i++) feed(35.1 + i * 0.00001, i + 1);
        const before = store.get(locationAtom);
        for (let i = 0; i < 6; i++) {
          feed(36 + i, 13 + i);
          expect(store.get(locationAtom)).toBe(before);
        }
        feed(35.10013, 19);
        // 異常値で候補を置き換えないため、この良好な点で即座に復帰する。
        expect(store.get(locationAtom)).toEqual(fix(35.10013, 19));
        feed(35.10014, 20);
        // 復帰後は通常のEMAへ戻る。生座標による再同期を繰り返さない。
        expect(store.get(locationAtom)?.coords.latitude).toBe(
          0.8 * 35.10014 + 0.2 * 35.10013
        );
      });

      it.each([500, 1500, 1600])(
        'holds ETA rejections and confirms recovery from accuracy %s',
        (accuracy) => {
          seed(34.9);
          if (accuracy === 500) feed(34.9, 0.5, 1500);
          feed(34.9, 1, accuracy);
          const stations = Array.from(
            { length: 5 },
            (_, i) =>
              ({
                id: i + 1,
                latitude: 35 + i * 0.01,
                longitude: 139,
              }) as Station
          );
          store.set(stationState, (prev) => ({ ...prev, stations }));
          store.set(
            etaStopsAtom,
            stations.map((_, i) => ({
              stationId: i + 1,
              cumulativeMinutes: i * 2,
              departureCumulativeMinutes: i * 2 + 0.5,
            }))
          );
          store.set(etaAnchorAtom, {
            stationId: 1,
            kind: 'DEPARTED',
            observedAtMs: t,
          });
          const before = store.get(locationAtom);
          for (let i = 2; i <= 13; i++) {
            feed(35.04, i);
            expect(store.get(locationAtom)).toBe(before);
          }
          expect(getLocationPipelineCounts().rejectedByEta).toBe(12);
          // ETAを通る最初の一点だけでは古い基準を破棄しない。
          feed(35.01001, 14);
          expect(store.get(locationAtom)).toBe(before);
          feed(35.04, 15);
          expect(store.get(locationAtom)).toBe(before);
          feed(35.01001, 16);
          expect(store.get(locationAtom)).toBe(before);
          feed(35.01002, 17);
          expect(store.get(locationAtom)?.coords.latitude).toBe(35.01002);
          const recovered = store.get(locationAtom);
          // ETA範囲内でも、復帰後の1秒・約1kmの移動は速度で棄却する。
          feed(35.00001, 18);
          expect(store.get(locationAtom)).toBe(recovered);
          expect(getLocationPipelineCounts().rejectedBySpeed).toBe(3);
        }
      );
    }
  );
});
