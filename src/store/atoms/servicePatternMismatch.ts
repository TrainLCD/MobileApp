import { atom } from 'jotai';
import { TrainTypeKind } from '~/@types/graphql';
import { STORAGE_KEYS } from '~/constants/storage';
import { storage } from '~/lib/storage';
import { isCanaryApp } from '~/utils/isDevApp';
import { isBusLine } from '~/utils/line';
import type { ServicePatternMismatch } from '~/utils/servicePatternMismatch';
import { selectedLineAtom } from './line';
import { autoModeEnabledAtom, trainTypeAtom } from './navigation';
import {
  selectedBoundAtom,
  selectedDirectionAtom,
  stationsAtom,
} from './station';

export const servicePatternDetectionEnabledAtom = atom(
  isCanaryApp &&
    storage.getString(STORAGE_KEYS.SERVICE_PATTERN_DETECTION_ENABLED) === 'true'
);

export const servicePatternRouteAtom = atom((get) => {
  if (
    !isCanaryApp ||
    !get(servicePatternDetectionEnabledAtom) ||
    get(autoModeEnabledAtom)
  ) {
    return null;
  }
  const bound = get(selectedBoundAtom);
  const direction = get(selectedDirectionAtom);
  const stations = get(stationsAtom);
  const trainType = get(trainTypeAtom);
  const line = get(selectedLineAtom);
  if (!bound || !direction || !line || !stations.length) {
    return null;
  }
  const isBus = isBusLine(line);
  if (isBus && trainType?.kind !== TrainTypeKind.BusRoute) {
    return null;
  }

  return { stations, direction, busLineId: isBus ? line.id : null };
});

export const detectedServicePatternMismatchAtom = atom<{
  route: NonNullable<ReturnType<typeof servicePatternRouteAtom.read>>;
  mismatch: ServicePatternMismatch;
} | null>(null);

export const servicePatternWarningAtom = atom((get) => {
  const detected = get(detectedServicePatternMismatchAtom);
  return detected?.route === get(servicePatternRouteAtom)
    ? detected.mismatch
    : null;
});
