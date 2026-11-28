import { createStore } from 'jotai';
import { type Station, StopCondition, TransportType } from '~/@types/graphql';
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
  const origin = {
    id: 1,
    groupId: 11,
    line: { transportType: TransportType.Rail },
  } as Station;
  const bound = {
    id: 2,
    line: { transportType: TransportType.Rail },
  } as Station;
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
    { ...ctx, stations: ctx.stations.slice().reverse() },
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

test('a route refetch preserves the hint, but a changed stopping pattern ends it', () => {
  const { store, ctx } = setup();
  store.set(showImuDepartureAtom, ctx);
  const stations = ctx.stations.map((s) => ({ ...s }));
  store.set(stationState, (prev) => ({
    ...prev,
    station: stations[0],
    selectedBound: stations[1],
    stations,
  }));
  expect(store.get(displayArrivedAtom)).toBe(false);
  store.set(stationState, (prev) => ({
    ...prev,
    stations: [
      stations[0],
      { ...stations[1], stopCondition: StopCondition.Not },
    ],
  }));
  store.set(showImuDepartureAtom, ctx);
  expect(store.get(displayArrivedAtom)).toBe(true);
  store.set(stationsAtom, ctx.stations);
  expect(store.get(displayArrivedAtom)).toBe(true);
});

it.each([0, 1])(
  'ignores a shadow departure when endpoint %i has unknown transport',
  (index) => {
    const { store, ctx } = setup();
    const stations = ctx.stations.map((s, i) =>
      i === index ? { ...s, line: null } : s
    );
    store.set(stationState, (prev) => ({
      ...prev,
      station: stations[0],
      selectedBound: stations[1],
      stations,
    }));
    store.set(showImuDepartureAtom, { ...ctx, stations, bound: stations[1] });
    expect(store.get(displayArrivedAtom)).toBe(true);
    expect(store.get(headerStateAtom)).toBe('CURRENT');
  }
);
