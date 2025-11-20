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
    borderRadius: '100%',
    borderWidth: 2,
    borderColor: '#fff',
  },
  root: {
    borderWidth: isTablet ? 4 : 2,
    width: isTablet ? 72 * 1.5 : 72,
    height: isTablet ? 72 * 1.5 : 72,
    borderRadius: isTablet ? 72 * 1.5 : 72,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inner: {
    width: isTablet ? 66 * 1.5 : 66,
    height: isTablet ? 66 * 1.5 : 66,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderRadius: isTablet ? 70 * 1.5 : 70,
    borderWidth: 1,
    borderColor: 'white',
  },
  lineSymbol: {
    color: 'white',
    fontSize: isTablet ? 20 * 1.5 : 20,
    lineHeight: isTablet ? 20 * 1.5 : 20,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
    marginTop: isTablet ? 4 * 1.2 : 4,
  },
  rootTiny: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16.8,
    borderWidth: 1,
  },
  tinyInner: {
    width: 21.6,
    height: 21.6,
    borderRadius: 21.6 / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rootSmall: {
    width: isTablet ? 38 * 1.5 : 38,
    height: isTablet ? 38 * 1.5 : 38,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderRadius: isTablet ? 38 * 1.5 : 38,
    borderWidth: isTablet ? 2 : 1,
    borderColor: 'white',
  },
  smallInner: {
    width: isTablet ? 33 * 1.5 : 33,
    height: isTablet ? 33 * 1.5 : 33,
    borderRadius: (isTablet ? 33 * 1.5 : 33) / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lineSymbolTiny: {
    color: 'white',
    fontSize: 10,
    lineHeight: 10,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
    marginTop: 2,
  },
  lineSymbolSmall: {
    color: 'white',
    fontSize: isTablet ? 18 * 1.5 : 18,
    lineHeight: isTablet ? 18 * 1.5 : 18,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
    marginTop: isTablet ? 6 : 4,
  },
  stationNumber: {
    color: 'white',
    fontSize: isTablet ? 35 * 1.5 : 35,
    lineHeight: isTablet ? 35 * 1.5 : 35,
    marginTop: isTablet ? -2 * 1.2 : -2,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
  },
});

const NumberingIconSanyo: React.FC<Props> = ({
  stationNumber: stationNumberRaw,
  lineColor,
  size,
  withOutline,
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = stationNumberRaw.split('-');
  const stationNumber = stationNumberRest.join('');

  if (size === NUMBERING_ICON_SIZE.SMALL) {
    return (
      <View style={[styles.rootTiny, { borderColor: lineColor }]}>
        <View style={[styles.tinyInner, { backgroundColor: lineColor }]}>
          <Typography style={styles.lineSymbolTiny}>{lineSymbol}</Typography>
        </View>
      </View>
    );
  }

  if (size === NUMBERING_ICON_SIZE.MEDIUM) {
    return (
      <View style={[styles.rootSmall, { borderColor: lineColor }]}>
        <View style={[styles.smallInner, { backgroundColor: lineColor }]}>
          <Typography style={styles.lineSymbolSmall}>{lineSymbol}</Typography>
        </View>
      </View>
    );
  }

  return (
    <View style={withOutline ? styles.optionalBorder : undefined}>
      <View style={[styles.root, { borderColor: lineColor }]}>
        <View style={[styles.inner, { backgroundColor: lineColor }]}>
          <Typography style={styles.lineSymbol}>{lineSymbol}</Typography>
          <Typography style={styles.stationNumber}>{stationNumber}</Typography>
        </View>
      </View>
    </View>
  );
};

export default NumberingIconSanyo;
