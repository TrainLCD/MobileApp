import type React from 'react';
import { useId } from 'react';
import Svg, {
  ClipPath,
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
  type SvgProps,
} from 'react-native-svg';

type Props = {
  lineColor: string;
  hasTerminus: boolean;
  barHighlightOffset?: number;
} & SvgProps;

export const BarTerminalOdakyu: React.FC<Props> = (props: Props) => {
  const bgId = useId();
  const colorId = useId();
  const shadowId = useId();
  const glossId = useId();
  const clipId = useId();

  const { lineColor, hasTerminus, barHighlightOffset = 0.35 } = props;

  const arrowPath = 'M0 24V0l12.003 12L24 24l-11.997 12L0 48V24z';
  const terminusPath = 'M0,0H18c3.31,0,6,3.58,6,8V40c0,4.42-2.69,8-6,8H0V0Z';

  const d = hasTerminus ? terminusPath : arrowPath;

  return (
    <Svg viewBox="0 0 24 48" {...props}>
      <G clipPath={`url(#${clipId})`}>
        <Path d={d} fill={`url(#${bgId})`} />
        <Path d={d} fill={`url(#${colorId})`} />
        <Path d={d} fill={`url(#${shadowId})`} />
        <Path d={d} fill={`url(#${glossId})`} />
      </G>
      <Defs>
        <LinearGradient
          id={bgId}
          x1={0}
          y1={0}
          x2={0}
          y2={48}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset={barHighlightOffset} stopColor="#fff" />
          <Stop offset={barHighlightOffset} />
          <Stop offset={barHighlightOffset} />
          <Stop offset={0.9} stopColor="#fff" />
        </LinearGradient>
        <LinearGradient
          id={colorId}
          x1={0}
          y1={0}
          x2={0}
          y2={48}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset={0} stopColor={lineColor} />
          <Stop offset={1} stopColor={lineColor} stopOpacity={0.73} />
        </LinearGradient>
        <LinearGradient
          id={shadowId}
          x1={0}
          y1={0}
          x2={0}
          y2={48}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset={barHighlightOffset} stopColor="#000" stopOpacity={0} />
          <Stop offset={0.55} stopColor="#000" stopOpacity={0.2} />
          <Stop offset={0.85} stopColor="#000" stopOpacity={0} />
        </LinearGradient>
        <LinearGradient
          id={glossId}
          x1={0}
          y1={0}
          x2={0}
          y2={48}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset={0} stopColor="#fff" stopOpacity={0.27} />
          <Stop
            offset={barHighlightOffset}
            stopColor="#fff"
            stopOpacity={0.07}
          />
          <Stop offset={barHighlightOffset} stopColor="#000" stopOpacity={0} />
        </LinearGradient>
        <ClipPath id={clipId}>
          <Rect width={24} height={48} fill="#fff" />
        </ClipPath>
      </Defs>
    </Svg>
  );
};
