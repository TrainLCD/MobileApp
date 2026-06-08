import { useMemo } from 'react';
import { Platform } from 'react-native';
import type { Station } from '~/@types/graphql';
import isTablet from '~/utils/isTablet';

const LONG_NAME_THRESHOLD = Platform.OS === 'android' && isTablet ? 5 : 6;

/**
 * Check if any station in the list has a long name
 * A station name is considered "long" if it contains 'ー' or exceeds the threshold
 * @param stations - Array of stations to check
 * @returns true if any station has a long name
 */
export const useIncludesLongStationName = (stations: Station[]): boolean => {
  return useMemo(
    () =>
      !!stations.filter(
        (s) =>
          s.name?.includes('ー') || (s.name?.length ?? 0) > LONG_NAME_THRESHOLD
      ).length,
    [stations]
  );
};
