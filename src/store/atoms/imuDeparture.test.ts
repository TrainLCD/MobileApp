import { createStore } from 'jotai';
import type { Station } from '~/@types/graphql';
import type { Leg } from '~/lib/imuShadow';
import { manualStationCorrectionAtom } from './manualStationCorrection';
import { autoModeEnabledAtom, headerStateAtom } from './navigation';
import stationState, {
  clearImuDepartureAtom,
  displayArrivedAtom,
  selectedBoundAtom,
  selectedDirectionAtom,
  showImuDepartureAtom,
  stationAtom,
  stationsAtom,
} from './station';

const setup = () => {
  const store = createStore();
  const origin = { id: 1, groupId: 11 } as Station;
  const bound = { id: 2 } as Station;
  const stations = [origin, bound];
  const leg: Leg = {
    fromId: 1,
    toId: 2,
    distanceM: 800,
    etaSeconds: 80,
    missingPairs: [],
  };
  const ctx = { leg, stations, bound, direction: 'INBOUND' as const };
  store.set(stationAtom, origin);
  store.set(selectedBoundAtom, bound);
  store.set(selectedDirectionAtom, ctx.direction);
  store.set(stationsAtom, stations);
  store.set(headerStateAtom, 'CURRENT');
  return { store, ctx };
};

test('ignores a departure from another station, route, direction or simulated ride', () => {
  const { store, ctx } = setup();
  for (const invalid of [
    { ...ctx, leg: { ...ctx.leg, fromId: 99 } },
    { ...ctx, stations: [...ctx.stations] },
    { ...ctx, direction: 'OUTBOUND' as const },
  ])
    store.set(showImuDepartureAtom, invalid);
  store.set(autoModeEnabledAtom, true);
  store.set(showImuDepartureAtom, ctx);
  expect(store.get(displayArrivedAtom)).toBe(true);
  expect(store.get(headerStateAtom)).toBe('CURRENT');
});

test('a new GPS stop or manual station correction takes precedence over the IMU display', () => {
  const { store, ctx } = setup();
  store.set(showImuDepartureAtom, ctx);
  expect(store.get(displayArrivedAtom)).toBe(false);
  store.set(stationState, (prev) => ({ ...prev, arrived: false }));
  store.set(stationState, (prev) => ({ ...prev, arrived: true }));
  expect(store.get(displayArrivedAtom)).toBe(true);
  store.set(showImuDepartureAtom, ctx);
  store.set(manualStationCorrectionAtom, {
    station: ctx.stations[0],
    stations: ctx.stations,
    location: null,
  });
  expect(store.get(displayArrivedAtom)).toBe(true);
});

test('a junction alias may depart and an older recording cannot clear its hint', () => {
  const { store, ctx } = setup();
  const alias = { ...ctx, leg: { ...ctx.leg, fromId: 9 }, originGroupId: 11 };
  store.set(showImuDepartureAtom, alias);
  store.set(clearImuDepartureAtom, ctx.leg);
  expect(store.get(displayArrivedAtom)).toBe(false);
  store.set(clearImuDepartureAtom, alias.leg);
  expect(store.get(displayArrivedAtom)).toBe(true);
});
