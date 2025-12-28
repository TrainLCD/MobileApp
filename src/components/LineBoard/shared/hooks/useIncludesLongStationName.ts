import { useMemo } from 'react';
import type { Station } from '~/@types/graphql';

/**
 * Check if any station in the list has a long name
 * A station name is considered "long" if it contains 'ー' or has more than 6 characters
 * @param stations - Array of stations to check
 * @returns true if any station has a long name
 */
export const useIncludesLongStationName = (stations: Station[]): boolean => {
  return useMemo(
    () =>
      !!stations.filter(
        (s) => s.name?.includes('ー') || (s.name?.length ?? 0) > 6
      ).length,
    [stations]
  );
};
