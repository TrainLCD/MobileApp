import { atom, type Getter } from 'jotai';
import type { Station } from '~/@types/graphql';
import { LOCATION_TIME_INTERVAL } from '~/constants/location';
import type { LineDirection } from '~/models/Bound';
import { locationAtom } from './location';
import { manualStationCorrectionAtom } from './manualStationCorrection';
import { autoModeEnabledAtom, stationForHeaderAtom } from './navigation';
import {
  approachingAtom,
  arrivedAtom,
  selectedBoundAtom,
  selectedDirectionAtom,
  stationAtom,
  stationsAtom,
} from './station';

type LegContext = {
  origin: Station;
  target: Station;
  stations: Station[];
  bound: Station;
  direction: LineDirection;
};
const lastArrivalAtom = atom<(LegContext & { arrivedAtMs: number }) | null>(
  null
);

// Delayed fixes observed before arrival can still be delivered during the same ride.
export const holdingImuArrivalAtom = atom((get) => {
  const last = get(lastArrivalAtom);
  return (
    !!last &&
    (get(locationAtom)?.timestamp ?? Number.NEGATIVE_INFINITY) <=
      last.arrivedAtMs &&
    last.stations === get(stationsAtom) &&
    last.target === get(stationAtom) &&
    last.bound === get(selectedBoundAtom) &&
    last.direction === get(selectedDirectionAtom) &&
    !get(autoModeEnabledAtom)
  );
});

const mayUseImu = (get: Getter, ctx: LegContext, atMs: number) => {
  const fix = get(locationAtom);
  const correction = get(manualStationCorrectionAtom);
  return !(
    get(autoModeEnabledAtom) ||
    get(stationAtom) !== ctx.origin ||
    get(stationsAtom) !== ctx.stations ||
    get(selectedBoundAtom) !== ctx.bound ||
    get(selectedDirectionAtom) !== ctx.direction ||
    (correction &&
      correction.location === fix &&
      correction.stations === ctx.stations) ||
    (fix && atMs - fix.timestamp <= LOCATION_TIME_INTERVAL)
  );
};

export const applyImuArrivalAtom = atom(null, (get, set, ctx: LegContext) => {
  const arrivedAtMs = Date.now();
  if (!mayUseImu(get, ctx, arrivedAtMs)) return false;
  set(lastArrivalAtom, { ...ctx, arrivedAtMs });
  set(stationAtom, ctx.target);
  set(approachingAtom, false);
  set(arrivedAtom, true);
  set(stationForHeaderAtom, ctx.target);
  return true;
});
