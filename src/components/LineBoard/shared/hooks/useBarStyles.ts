import { useMemo } from 'react';
import { useScale } from '~/hooks/useScale';
import isTablet from '~/utils/isTablet';

export const useBarStyles = ({
  index,
}: {
  index?: number;
}): { left: number; width: number } => {
  const { widthScale } = useScale();

  const left = useMemo(() => {
    if (index === 0) {
      return widthScale(-32);
    }
    return widthScale(-20);
  }, [index, widthScale]);

  const width = useMemo(() => {
    if (isTablet) {
      if (index === 0) {
        return widthScale(200);
      }
      if (index === 1) {
        return widthScale(61.75);
      }
    }
    return widthScale(62);
  }, [index, widthScale]);

  return { left, width };
};
