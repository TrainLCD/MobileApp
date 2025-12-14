import Svg, { Path, type SvgProps } from 'react-native-svg';

export const CardChevron = ({ stroke, ...props }: SvgProps) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
    <Path
      d="M8 5l8 7-8 7"
      fill="none"
      stroke={stroke ?? '#fff'}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    />
  </Svg>
);
