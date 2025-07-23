import { useId } from 'react';
import {
  ClipPath,
  Defs,
  G,
  Polygon,
  Rect,
  Svg,
  type SvgProps,
} from 'react-native-svg';

export const JOCurrentArrowEdge = (props?: SvgProps) => {
  const id = useId();

  return (
    <Svg viewBox="0 0 150 400" {...props}>
      <Defs>
        <ClipPath id={id}>
          <Rect fill="none" width="150" height="400" />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${id})`}>
        <G>
          <Polygon
            strokeWidth="0"
            fill="#fff"
            points="0 -25 150 200 0 425 0 -25"
          />
        </G>
        <G>
          <Polygon
            fill="#dc143c"
            stroke="#fff"
            strokeMiterlimit="10"
            points="0 0 125 200 0 400 0 0"
          />
        </G>
      </G>
    </Svg>
  );
};
