import { useCallback, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const STANDARD_WIDTH = 375;
const STANDARD_HEIGHT = 667;

export const useScale = () => {
  const { width, height } = useWindowDimensions();
  const { left, right, top, bottom } = useSafeAreaInsets();

  const widthRatio = useMemo(() => {
    const usableWidth = width - left - right;
    const baseWidth = usableWidth > 0 ? usableWidth : width;
    return baseWidth / STANDARD_WIDTH;
  }, [width, left, right]);

  const heightRatio = useMemo(() => {
    const usableHeight = height - top - bottom;
    const baseHeight = usableHeight > 0 ? usableHeight : height;
    return baseHeight / STANDARD_HEIGHT;
  }, [height, top, bottom]);

  const widthScale = useCallback(
    (dimension: number): number => dimension * widthRatio,
    [widthRatio]
  );

  const heightScale = useCallback(
    (dimension: number): number => dimension * heightRatio,
    [heightRatio]
  );

  return { widthScale, heightScale };
};
