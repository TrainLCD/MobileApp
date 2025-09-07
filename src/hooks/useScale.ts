import { useWindowDimensions } from 'react-native';

export const useScale = () => {
  const dim = useWindowDimensions();

  const standardWidth = 375.0;
  const standardHeight = 667.0;

  // https://stackoverflow.com/a/57765368
  const widthScale = (dimension: number): number =>
    (dimension / standardWidth) * dim.width;
  const heightScale = (dimension: number): number =>
    (dimension / standardHeight) * dim.height;

  return { widthScale, heightScale };
};
