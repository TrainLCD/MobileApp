import { Path, Polygon, Svg, type SvgProps } from 'react-native-svg';

export const ChevronJO = (props?: SvgProps) => (
  <Svg viewBox="0 0 200 400" {...props}>
    <Polygon
      fill="#dc143c"
      strokeWidth="0"
      points="8 408 8 403.26 96.22 200 8 -3.26 8 -8 151 -8 241.28 200 151 408 8 408"
    />
    <Path
      strokeWidth="0"
      fill="#fff"
      d="m145.75,0l86.81,200-86.81,200H18.14l84.04-193.63,2.76-6.37-2.76-6.37L18.14,0h127.62m10.5-16H0V-1.6l87.5,201.6L0,401.6v14.4h156.25l93.75-216L156.25-16h0Z"
    />
  </Svg>
);
