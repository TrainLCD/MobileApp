import React from 'react';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

type Props = {
  color: 'RED' | 'BLUE' | 'WHITE';
};

const ChevronTY: React.FC<Props> = ({ color }: Props) => {
  const colors =
    color === 'BLUE'
      ? ['#3fa9f5', '#1d67e0', '#1765d4']
      : ['#be3d03', '#c21705', '#be3d03'];
  return (
    <Svg viewBox="0 0 45.59 49">
      <Defs>
        {color === 'WHITE' ? (
          <LinearGradient
            id="prefix__a"
            x1={22.98}
            y1={12.4}
            x2={22.98}
            y2={36.67}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset={0} stopColor="#aaa" />
            <Stop offset={0.5} stopColor="#aaa" />
            <Stop offset={0.5} stopColor="#aaa" />
            <Stop offset={0.9} stopColor="#aaa" />
          </LinearGradient>
        ) : (
          <LinearGradient
            id="prefix__a"
            x1={22.98}
            y1={12.4}
            x2={22.98}
            y2={36.67}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset={0} stopColor={colors[0]} />
            <Stop offset={0.5} stopColor={colors[1]} />
            <Stop offset={0.5} stopColor="#333" />
            <Stop offset={0.9} stopColor={colors[2]} />
          </LinearGradient>
        )}
      </Defs>
      <Path
        stroke="#fff"
        strokeMiterlimit={10}
        fill="url(#prefix__a)"
        d="M27.67.5H.98l17.3 24.06L1.06 48.5h26.69l17.23-23.94L27.67.5z"
      />
    </Svg>
  );
};

export default ChevronTY;
