import type React from 'react';
import Svg, { Polygon } from 'react-native-svg';

// 走行中の現在位置を示す青い矢じり。通過済みの区間の先端に付く。
// 実物は幅がバーの高さの半分ほどで、上下の辺はさらにその半分弱しかない細い形。
// 斜めの辺は白く縁取られる
export const ChevronSanyo: React.FC = () => (
  <Svg
    width="100%"
    height="100%"
    viewBox="0 0 24 48"
    preserveAspectRatio="none"
  >
    <Polygon
      points="0,1 10,1 23,24 10,47 0,47"
      fill="#2A7FE6"
      stroke="#fff"
      strokeWidth={2}
      strokeLinejoin="miter"
    />
  </Svg>
);
