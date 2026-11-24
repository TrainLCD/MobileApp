import { useMemo } from 'react';
import { Platform } from 'react-native';
import type { Station } from '~/@types/graphql';
import isTablet from '~/utils/isTablet';

const LONG_NAME_THRESHOLD = Platform.OS === 'android' && isTablet ? 5 : 6;

export const useIncludesLongStationName = (
  stations: Station[],
  maxVerticalChars = LONG_NAME_THRESHOLD
): boolean =>
  useMemo(
    () =>
      stations.some(
        (s) =>
          s.name?.includes('ー') || (s.name?.length ?? 0) > maxVerticalChars
      ),
    [stations, maxVerticalChars]
  );
