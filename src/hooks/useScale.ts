import { useCallback } from 'react';
import { PixelRatio, useWindowDimensions } from 'react-native';

const standardWidth = 375.0;
const standardHeight = 667.0;

export const useScale = () => {
  const { width: myWidth, height: myHeight } = useWindowDimensions();

  const widthScale = useCallback(
    (dimension: number): number =>
      PixelRatio.roundToNearestPixel((dimension / standardWidth) * myWidth),
    [myWidth]
  );
  const heightScale = useCallback(
    (dimension: number): number =>
      PixelRatio.roundToNearestPixel((dimension / standardHeight) * myHeight),
    [myHeight]
  );

  return { widthScale, heightScale, myWidth, myHeight };
};
