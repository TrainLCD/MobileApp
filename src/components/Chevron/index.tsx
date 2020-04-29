import React from 'react';
import { LinearGradient, Path, Stop, Svg } from 'react-native-svg';

const Chevron: React.FC = () => (
  <Svg viewBox="0 0 393.2 296" width="100%" height="100%">
    <LinearGradient
      id="prefix__a"
      gradientUnits="userSpaceOnUse"
      x1={4}
      y1={150}
      x2={388}
      y2={150}
      gradientTransform="matrix(1 0 0 -1 0 298)"
    >
      <Stop offset={0} stopColor="#66bc81" />
      <Stop offset={0.5} stopColor="#094" />
      <Stop offset={1} stopColor="#008a43" />
    </LinearGradient>
    <Path
      fill="url(#prefix__a)"
      stroke="#fff"
      strokeWidth={8}
      strokeMiterlimit={10}
      d="M268 4H4v288h264l120-144z"
    />
  </Svg>
);

export default Chevron;
