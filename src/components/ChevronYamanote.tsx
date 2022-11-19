import React from 'react';
import { LinearGradient, Path, Stop, Svg, Polygon } from 'react-native-svg';

type Props = {
  backgroundScale: number;
  arrived: boolean;
};

export default class ChevronYamanote extends React.PureComponent<Props> {
  render(): React.ReactElement {
    const { backgroundScale, arrived } = this.props;

    if (!arrived) {
      return (
        <Svg viewBox="0 0 393 296">
          <Polygon
            fill="#ff1d25"
            points="4 129.04 196.5 4.76 389 129.04 389 287.94 197.01 142.14 4 287.96 4 129.04"
          />
          <Path
            fill="#fff"
            d="M196.5,9.52,385,131.21V279.88L201.84,140.78,197,137.12l-4.83,3.65L8,279.93V131.21L196.5,9.52m0-9.52L0,126.86V296L197,147.15,393,296V126.86L196.5,0Z"
          />
        </Svg>
      );
    }

    return (
      <Svg viewBox="0 0 393.2 296" width="100%" height="100%">
        <LinearGradient
          id="prefix__a"
          gradientUnits="userSpaceOnUse"
          x1={4}
          y1={150}
          x2={388}
          y2={150}
          gradientTransform="matrix(1 0 0 -1 0 298)"
        >
          <Stop offset={0} stopColor="crimson" />
          <Stop offset={1} stopColor="crimson" />
        </LinearGradient>
        <Path fill="#fff" d="M268 4H4v288h264l120-144z" />
        <Path
          scale={arrived && backgroundScale}
          fill="url(#prefix__a)"
          d="M268 4H4v288h264l120-144z"
          origin="196, 148"
        />
      </Svg>
    );
  }
}
