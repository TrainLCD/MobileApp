import { Dimensions } from 'react-native';

const { width: myWidth, height: myHeight } = Dimensions.get('screen');
const standardWidth = 375.0;
const standardHeight = 667.0;

// https://stackoverflow.com/a/57765368
export const widthScale = (dimension: number, width?: number): number =>
  (dimension / standardWidth) * (width ?? myWidth);
export const heightScale = (dimension: number, height?: number): number =>
  (dimension / standardHeight) * (height ?? myHeight);
