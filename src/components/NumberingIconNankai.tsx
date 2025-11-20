import type React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Ellipse } from 'react-native-svg';
import {
  FONTS,
  NUMBERING_ICON_SIZE,
  type NumberingIconSize,
} from '../constants';
import isTablet from '../utils/isTablet';
import Typography from './Typography';

type Props = {
  stationNumber: string;
  lineColor: string;
  size?: NumberingIconSize;
  withOutline?: boolean;
};

const styles = StyleSheet.create({
  optionalBorder: {
    borderRadius: '100%',
    borderWidth: 2,
    borderColor: '#fff',
  },
  root: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  texts: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lineSymbol: {
    color: 'white',
    fontSize: isTablet ? 18 * 1.5 : 18,
    lineHeight: isTablet ? 18 * 1.5 : 18,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
    marginTop: isTablet ? 8 : 4,
  },
  rootTiny: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderRadius: 16.8,
    borderWidth: 1,
    borderColor: 'white',
  },
  lineSymbolTiny: {
    color: 'white',
    fontSize: 10,
    lineHeight: 10,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
    marginTop: 2,
  },
  stationNumber: {
    color: 'white',
    fontSize: isTablet ? 32 * 1.5 : 32,
    lineHeight: isTablet ? 32 * 1.5 : 32,
    marginTop: isTablet ? -4 * 1.2 : -4,
    textAlign: 'center',
    fontFamily: FONTS.MyriadPro,
  },
});

const NumberingIconNankai: React.FC<Props> = ({
  stationNumber: stationNumberRaw,
  lineColor,
  size,
  withOutline,
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = stationNumberRaw.split('-');
  const stationNumber = stationNumberRest.join('-');

  if (size === NUMBERING_ICON_SIZE.SMALL) {
    return (
      <View style={[styles.rootTiny, { backgroundColor: lineColor }]}>
        <Typography style={styles.lineSymbolTiny}>{lineSymbol}</Typography>
      </View>
    );
  }

  return (
    <View style={withOutline ? styles.optionalBorder : undefined}>
      <View style={styles.root}>
        <Svg height={isTablet ? 72 * 1.5 : 72} width={isTablet ? 72 * 1.5 : 72}>
          <Ellipse
            cx={(isTablet ? 72 * 1.5 : 72) / 2}
            cy={(isTablet ? 72 * 1.5 : 72) / 2}
            rx={(isTablet ? 72 * 1.5 : 72) / 2}
            ry={(isTablet ? 72 * 1.5 : 72) / 2.5}
            stroke="white"
            strokeWidth={1}
            fill={lineColor}
          />
        </Svg>
        <View style={styles.texts}>
          <Typography style={styles.lineSymbol}>{lineSymbol}</Typography>
          <Typography style={styles.stationNumber}>{stationNumber}</Typography>
        </View>
      </View>
    </View>
  );
};

export default NumberingIconNankai;
