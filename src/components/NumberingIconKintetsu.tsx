import type React from 'react';
import { StyleSheet, View } from 'react-native';
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
    borderRadius: isTablet ? 8 * 1.5 : 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  root: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    width: isTablet ? 84 * 1.5 : 84,
    height: isTablet ? 58 * 1.5 : 58,
    borderRadius: isTablet ? 6 * 1.5 : 6,
    borderWidth: 1,
    borderColor: 'white',
  },
  rootTiny: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'white',
  },
  rootMedium: {
    width: isTablet ? 35 * 1.5 : 35,
    height: isTablet ? 35 * 1.5 : 35,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderRadius: isTablet ? 4 * 1.5 : 4,
    borderWidth: 1,
    borderColor: 'white',
  },
  lineSymbol: {
    color: 'white',
    fontSize: isTablet ? 37 * 1.5 : 35,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
    marginTop: -4,
    transform: [{ scaleY: 1.25 }],
  },
  lineSymbolMedium: {
    color: 'white',
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
    fontSize: isTablet ? 25 * 1.5 : 25,
    lineHeight: isTablet ? 25 * 1.5 : 25,
    marginTop: isTablet ? 8 : 4,
  },
  lineSymbolTiny: {
    color: 'white',
    fontSize: 10,
    lineHeight: 10,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
    marginTop: 2,
  },
  stationNumber: {
    color: 'white',
    fontSize: isTablet ? 37 * 1.5 : 35,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
    marginTop: -4,
    transform: [{ scaleY: 1.25 }],
  },
});

const NumberingIconKintetsu: React.FC<Props> = ({
  stationNumber: stationNumberRaw,
  lineColor,
  size,
  withOutline,
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = stationNumberRaw.split('-');
  const stationNumber = stationNumberRest.join('');

  if (size === NUMBERING_ICON_SIZE.SMALL) {
    return (
      <View style={[styles.rootTiny, { backgroundColor: lineColor }]}>
        <Typography style={styles.lineSymbolTiny}>{lineSymbol}</Typography>
      </View>
    );
  }

  if (size === NUMBERING_ICON_SIZE.MEDIUM) {
    return (
      <View style={[styles.rootMedium, { backgroundColor: lineColor }]}>
        <Typography style={styles.lineSymbolMedium}>{lineSymbol}</Typography>
      </View>
    );
  }

  return (
    <View style={withOutline ? styles.optionalBorder : undefined}>
      <View style={[styles.root, { backgroundColor: lineColor }]}>
        <Typography style={styles.lineSymbol}>{lineSymbol}</Typography>
        <Typography style={styles.stationNumber}>{stationNumber}</Typography>
      </View>
    </View>
  );
};

export default NumberingIconKintetsu;
