import { Dimensions } from 'react-native';

export const myWidth = Dimensions.get('window').width;
const standardWidth = 375.0;

// https://stackoverflow.com/a/57765368
const widthScale = (dimension: number): number =>
  (dimension / standardWidth) * myWidth;

export default widthScale;
