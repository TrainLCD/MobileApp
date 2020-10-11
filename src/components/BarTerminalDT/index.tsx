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
} & SvgProps;

const ChevronDT: React.FC<Props> = (props: Props) => {
  const { lineColor } = props;
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

export default React.memo(ChevronDT);
