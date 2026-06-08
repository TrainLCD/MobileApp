import { useCallback } from 'react';
import { PixelRatio } from 'react-native';
import { useLandscapeWindowDimensions } from './useLandscapeWindowDimensions';

const standardWidth = 375.0;
const standardHeight = 667.0;

export const useScale = () => {
  const { width: myWidth, height: myHeight } = useLandscapeWindowDimensions();

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
