import type React from 'react';
import { useId } from 'react';
import Svg, {
  Defs,
  LinearGradient,
  Path,
  Stop,
  type SvgProps,
} from 'react-native-svg';

type Props = {
  lineColor: string;
  hasTerminus: boolean;
} & SvgProps;

export const BarTerminalSaikyo: React.FC<Props> = (props: Props) => {
  const aId = useId();
  const bId = useId();
  const prefixAId = useId();
  const prefixBId = useId();

  const { lineColor, hasTerminus } = props;
  if (hasTerminus) {
    return (
      <Svg viewBox="0 0 41.57 48" {...props}>
        <Defs>
          <LinearGradient
            id={aId}
            x1={20.78}
            y1={48}
            x2={20.78}
            gradientTransform="matrix(1, 0, 0, -1, 0, 48)"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset={0.1} stopColor="#fff" />
            <Stop offset={0.5} stopColor="#000" />
            <Stop offset={0.9} stopColor="#000" />
          </LinearGradient>
          <LinearGradient
            id={bId}
            x1={20.78}
            y1={48}
            x2={20.78}
            gradientTransform="matrix(1, 0, 0, -1, 0, 48)"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset={0} stopColor={lineColor} />
            <Stop offset={1} stopColor={lineColor} stopOpacity={0.73} />
          </LinearGradient>
        </Defs>
        <Path
          d="M0,0H34.64c3.83,0,6.93,3.58,6.93,8V40c0,4.42-3.1,8-6.93,8H0V0Z"
          fill={`url(#${aId})`}
        />
        <Path
          d="M0,0H34.64c3.83,0,6.93,3.58,6.93,8V40c0,4.42-3.1,8-6.93,8H0V0Z"
          fill={`url(#${bId})`}
        />
      </Svg>
    );
  }

  return (
    <Svg viewBox="0 0 41.57 48" {...props}>
      <Defs>
        <LinearGradient
          id={prefixAId}
          x1={0}
          y1={0}
          x2={0}
          y2={48}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset={0.1} stopColor="#fff" />
          <Stop offset={0.5} stopColor="#000" />
          <Stop offset={0.9} stopColor="#000" />
        </LinearGradient>
        <LinearGradient
          id={prefixBId}
          x1={0}
          y1={0}
          x2={0}
          y2={48}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset={0} stopColor={lineColor} />
          <Stop offset={1} stopColor={lineColor} stopOpacity={0.73} />
        </LinearGradient>
      </Defs>
      <Path
        fill={`url(#${prefixAId})`}
        d="M0 24V0l20.79 12 20.78 12-20.78 12L0 48V24z"
      />
      <Path
        fill={`url(#${prefixBId})`}
        d="M0 24V0l20.79 12 20.78 12-20.78 12L0 48V24z"
      />
    </Svg>
  );
};
