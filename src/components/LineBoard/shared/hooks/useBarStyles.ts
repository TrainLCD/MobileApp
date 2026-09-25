import { useMemo } from 'react';
import { useScale } from '~/hooks/useScale';
import isTablet from '~/utils/isTablet';

export const useBarStyles = ({
  index,
  stationsLength,
}: {
  index?: number;
  // 空き枠を描かず最後の駅の枠に終端を置くテーマが渡す。タブレットの先頭の枠の線を
  // 最後の駅の枠の線の右端で止め、終端(BarTerminal)が長い線に埋もれないようにする
  stationsLength?: number;
}): { left: number; width: number } => {
  const { widthScale, myWidth } = useScale();

  const left = useMemo(() => {
    if (index === 0) {
      return widthScale(-32);
    }
    return widthScale(-20);
  }, [index, widthScale]);

  const width = useMemo(() => {
    if (isTablet) {
      if (index === 0) {
        const fullWidth = widthScale(200);
        if (!stationsLength || stationsLength < 2) {
          return fullWidth;
        }
        // 駅の枠の幅は LineBoard の各テーマと同じ画面幅の 1/9
        const lastIndex = stationsLength - 1;
        const lastBarRight =
          (myWidth / 9) * lastIndex +
          widthScale(-20) +
          widthScale(lastIndex === 1 ? 61.75 : 62);
        return Math.min(fullWidth, lastBarRight - left);
      }
      if (index === 1) {
        return widthScale(61.75);
      }
    }
    return widthScale(62);
  }, [index, left, myWidth, stationsLength, widthScale]);

  return { left, width };
};

export { useChevronPosition } from './useChevronPosition';
export { useIncludesLongStationName } from './useIncludesLongStationName';
