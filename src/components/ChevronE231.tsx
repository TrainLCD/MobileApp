import type React from 'react';
import { useId } from 'react';
import Svg, { Defs, LinearGradient, Polygon, Stop } from 'react-native-svg';

export const ChevronE231: React.FC = () => {
  const id = useId();

  return (
    <Svg viewBox="0 0 393.2 296">
      <Defs>
        <LinearGradient
          id={id}
          x1={4}
          y1={150}
          x2={388}
          y2={150}
          gradientUnits="userSpaceOnUse"
          gradientTransform="matrix(1 0 0 -1 0 298)"
        >
          <Stop offset={0} stopColor="#66BC81" />
          <Stop offset={0.5} stopColor="#009944" />
          <Stop offset={1} stopColor="#008A43" />
        </LinearGradient>
      </Defs>
      <Polygon
        points="268,4 4,4 4,292 268,292 388,148"
        fill={`url(#${id})`}
        stroke="#FFFFFF"
        strokeWidth={8}
        strokeMiterlimit={10}
      />
    </Svg>
  );
};
