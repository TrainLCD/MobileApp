import type React from 'react';
import { useId } from 'react';
import Svg, { Defs, LinearGradient, Polygon, Stop } from 'react-native-svg';

type Props = {
  gradient?: boolean;
};

const PassChevronEast: React.FC<Props> = ({ gradient = false }) => {
  const id = useId();

  return (
    <Svg viewBox="0 0 32 49">
      {gradient && (
        <Defs>
          <LinearGradient
            id={id}
            x1={0}
            y1={0}
            x2={32}
            y2={49}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset={0} stopColor="#fff" />
            <Stop offset={0.5} stopColor="#e0e0e0" />
            <Stop offset={1} stopColor="#aaa" />
          </LinearGradient>
        </Defs>
      )}
      <Polygon
        points="0 0 0 10.57 17.85 24.24 0 37.9 0 49 32 24.5 0 0"
        fill={gradient ? `url(#${id})` : '#fff'}
      />
    </Svg>
  );
};

export default PassChevronEast;
