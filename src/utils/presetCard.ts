import type { Station } from '~/@types/graphql';
import { isSameStationShallow } from './station';

export type PresetEndpoints = {
  title: string;
  from?: Station | null;
  to?: Station | null;
};

export const arePresetCardPropsEqual = (
  prev: Readonly<PresetEndpoints>,
  next: Readonly<PresetEndpoints>
): boolean => {
  if (prev.title !== next.title) return false;
  return (
    isSameStationShallow(prev.from, next.from) &&
    isSameStationShallow(prev.to, next.to)
  );
};
