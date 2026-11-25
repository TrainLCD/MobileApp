import type { LocationObject } from 'expo-location';
import { createStore } from 'jotai';
import type { Station } from '~/@types/graphql';
import { applyImuArrivalAtom, holdingImuArrivalAtom } from './imuArrival';
import { locationAtom } from './location';
import { manualStationCorrectionAtom } from './manualStationCorrection';
import { autoModeEnabledAtom, stationForHeaderAtom } from './navigation';
import {
  arrivedAtom,
  selectedBoundAtom,
  selectedDirectionAtom,
  stationAtom,
  stationsAtom,
} from './station';

const setup = () => {
  const store = createStore();
  const origin = { id: 1 } as Station;
  const target = { id: 2 } as Station;
  const ctx = {
    origin,
    target,
    bound: target,
    direction: 'INBOUND' as const,
    stations: [origin, target],
  };
  store.set(stationAtom, origin);
  store.set(stationsAtom, ctx.stations);
  store.set(selectedBoundAtom, target);
  store.set(selectedDirectionAtom, ctx.direction);
  store.set(arrivedAtom, false);
  return { store, ctx };
};

it('advances to the stop once and releases the stale-fix guard on the next fix', () => {
  const { store, ctx } = setup();
  store.set(locationAtom, { timestamp: Date.now() - 11000 } as LocationObject);
  store.set(applyImuArrivalAtom, ctx);
  expect(store.get(arrivedAtom)).toBe(true);
  expect(store.get(stationForHeaderAtom)).toBe(ctx.target);
  expect(store.get(holdingImuArrivalAtom)).toBe(true);
  store.set(locationAtom, { timestamp: Date.now() } as LocationObject);
  expect(store.get(holdingImuArrivalAtom)).toBe(false);
});

it.each(['fresh fix', 'manual correction', 'direction changed', 'simulation'])(
  'discards the candidate for %s',
  (reason) => {
    const { store, ctx } = setup();
    if (reason === 'fresh fix')
      store.set(locationAtom, { timestamp: Date.now() } as LocationObject);
    if (reason === 'manual correction')
      store.set(manualStationCorrectionAtom, {
        location: null,
        station: ctx.origin,
        stations: ctx.stations,
      });
    if (reason === 'direction changed')
      store.set(selectedDirectionAtom, 'OUTBOUND');
    if (reason === 'simulation') store.set(autoModeEnabledAtom, true);
    store.set(applyImuArrivalAtom, ctx);
    expect(store.get(stationAtom)).toBe(ctx.origin);
    expect(store.get(arrivedAtom)).toBe(false);
  }
);
