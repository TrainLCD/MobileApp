import { useMemo } from 'react';
import { useScale } from '~/hooks/useScale';

/**
 * Calculate chevron position based on station index and state
 * @param index - Station index
 * @param arrived - Whether the train has arrived at the station
 * @param passed - Whether the train has passed the station
 * @returns Style object with left position, or null if chevron shouldn't be shown
 */
export const useChevronPosition = (
  index: number,
  arrived: boolean,
  passed: boolean
): { left: number } | null => {
  const { widthScale } = useScale();

  return useMemo(() => {
    if (!index) {
      return arrived ? { left: widthScale(-14) } : null;
    }

    if (arrived) {
      return {
        left: widthScale(41.75 * index) - widthScale(14),
      };
    }

    if (!passed) {
      return {
        left: widthScale(arrived ? 45 : 42 * index),
      };
    }

    return {
      left: widthScale(42 * index),
    };
  }, [arrived, index, passed, widthScale]);
};
