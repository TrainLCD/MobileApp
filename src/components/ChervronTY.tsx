import { useId, useMemo } from 'react';
import { Defs, LinearGradient, Path, Stop, Svg } from 'react-native-svg';

type Props = {
  color: 'RED' | 'BLUE' | 'WHITE' | 'BLACK';
};

export const ChevronTY: React.FC<Props> = ({ color }: Props) => {
  const id = useId();

  const colors = useMemo(() => {
    switch (color) {
      case 'RED':
        return ['#be3d03', '#c21705', '#333', '#be3d03'];
      case 'BLUE':
        return ['#3fa9f5', '#1d67e0', '#333', '#1765d4'];
      case 'BLACK':
        return ['#333', '#333', '#666', '#333'];
      case 'WHITE':
        return ['#aaa', '#aaa', '#aaa', '#aaa'];
      default:
        return ['#aaa', '#aaa', '#aaa', '#aaa'];
    }
  }, [color]);

  return (
    <Svg viewBox="0 0 45.59 49">
      <Defs>
        <LinearGradient
          id={id}
          x1={22.98}
          y1={12.4}
          x2={22.98}
          y2={36.67}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset={0} stopColor={colors[0]} />
          <Stop offset={0.5} stopColor={colors[1]} />
          <Stop offset={0.5} stopColor={colors[2]} />
          <Stop offset={0.9} stopColor={colors[3]} />
        </LinearGradient>
      </Defs>
      <Path
        stroke="#fff"
        strokeMiterlimit={10}
        fill={`url(#${id})`}
        d="M27.67.5H.98l17.3 24.06L1.06 48.5h26.69l17.23-23.94L27.67.5z"
      />
    </Svg>
  );
};
