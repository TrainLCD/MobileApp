import React from 'react';
import { Path, Polygon, Svg } from 'react-native-svg';

const ChevronLightweight: React.FC = () => (
  <Svg viewBox="0 0 296 296">
    <Polygon
      points="21.83 3.46 272.17 148 21.83 292.54 21.83 3.46"
      fill="crimson"
    />
    <Path
      d="M27.83,13.86,260.17,148,27.83,282.14V13.86M19.83,0V296L276.17,148,19.83,0Z"
      fill="white"
    />
  </Svg>
);

export default ChevronLightweight;
