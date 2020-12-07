import React from 'react';
import Svg, {
  Defs,
  LinearGradient,
  Path,
  Stop,
  SvgProps,
} from 'react-native-svg';

type Props = {
  lineColor: string;
  hasTerminus: boolean;
} & SvgProps;

const BarTerminalEast: React.FC<Props> = (props: Props) => {
  const { lineColor, hasTerminus } = props;
  if (hasTerminus) {
    return (
      // eslint-disable-next-line react/jsx-props-no-spreading
      <Svg viewBox="0 0 41.57 48" {...props}>
        <Defs>
          <LinearGradient
            id="a"
            x1={24}
            x2={24}
            y2={48}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset={0.5} stopColor="#fff" />
            <Stop offset={0.5} />
            <Stop offset={0.5} />
            <Stop offset={0.9} stopColor="#fff" />
          </LinearGradient>
          <LinearGradient
            id="b"
            x1={24}
            x2={24}
            y2={48}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset={0} stopColor={lineColor} />
            <Stop offset={1} stopColor={lineColor} stopOpacity={0.73} />
          </LinearGradient>
        </Defs>
        <Path
          d="M0,0H40a8,8,0,0,1,8,8V40a8,8,0,0,1-8,8H0a0,0,0,0,1,0,0V0A0,0,0,0,1,0,0Z"
          fill="url(#a)"
        />
        <Path
          d="M0,0H40a8,8,0,0,1,8,8V40a8,8,0,0,1-8,8H0a0,0,0,0,1,0,0V0A0,0,0,0,1,0,0Z"
          fill="url(#b)"
        />
      </Svg>
    );
  }

  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <Svg viewBox="0 0 41.57 48" {...props}>
      <Defs>
        <LinearGradient
          id="prefix__a"
          x1={0}
          y1={0}
          x2={0}
          y2={48}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset={0.5} stopColor="#fff" />
          <Stop offset={0.5} />
          <Stop offset={0.5} />
          <Stop offset={0.9} stopColor="#fff" />
        </LinearGradient>
        <LinearGradient
          id="prefix__b"
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
        fill="url(#prefix__a)"
        d="M0 24V0l20.79 12 20.78 12-20.78 12L0 48V24z"
      />
      <Path
        fill="url(#prefix__b)"
        d="M0 24V0l20.79 12 20.78 12-20.78 12L0 48V24z"
      />
    </Svg>
  );
};

export default React.memo(BarTerminalEast);
