import { useWindowDimensions } from 'react-native';

const standardWidth = 375.0;
const standardHeight = 667.0;

export const useScale = () => {
  const { width: myWidth, height: myHeight } = useWindowDimensions();

  const widthScale = (dimension: number): number =>
    (dimension / standardWidth) * myWidth;
  const heightScale = (dimension: number): number =>
    (dimension / standardHeight) * myHeight;

  return { widthScale, heightScale, myWidth, myHeight };
};
