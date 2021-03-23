import { Dimensions } from 'react-native';

const { width: myWidth, height: myHeight } = Dimensions.get('window');
const standardWidth = 375.0;
const standardHeight = 667.0;

// https://stackoverflow.com/a/57765368
export const widthScale = (dimension: number): number =>
  (dimension / standardWidth) * myWidth;
export const heightScale = (dimension: number): number =>
  (dimension / standardHeight) * myHeight;
