import React from 'react';
import Svg, { Polygon, SvgProps } from 'react-native-svg';

const Hexagon: React.FC<SvgProps> = ({ fill, ...rest }: SvgProps) => (
  // eslint-disable-next-line react/jsx-props-no-spreading
  <Svg viewBox="0 0 80 69.28" {...rest}>
    <Polygon
      fill={fill}
      points="60 0 20 0 0 34.64 20 69.28 60 69.28 80 34.64 60 0"
    />
  </Svg>
);

export default Hexagon;
