import { useCallback } from 'react';
import { useWindowDimensions } from 'react-native';

const standardWidth = 375.0;
const standardHeight = 667.0;

export const useScale = () => {
  const { width: myWidth, height: myHeight } = useWindowDimensions();

  const widthScale = useCallback(
    (dimension: number): number => (dimension / standardWidth) * myWidth,
    [myWidth]
  );
  const heightScale = useCallback(
    (dimension: number): number => (dimension / standardHeight) * myHeight,
    [myHeight]
  );

  return { widthScale, heightScale, myWidth, myHeight };
};
