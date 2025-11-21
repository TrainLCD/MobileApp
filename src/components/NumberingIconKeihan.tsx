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
  size?: NumberingIconSize;
  withOutline?: boolean;
};

const styles = StyleSheet.create({
  optionalBorder: {
    borderWidth: 2,
    borderColor: '#fff',
  },
  root: {
    width: isTablet ? 72 * 1.5 : 72,
    height: isTablet ? 48 * 1.5 : 48,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#1d2088',
    backgroundColor: '#1d2088',
  },
  rootTiny: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderWidth: 1,
    borderColor: 'white',
    backgroundColor: '#1d2088',
  },
  rootMedium: {
    width: isTablet ? 35 * 1.5 : 35,
    height: isTablet ? 35 * 1.5 : 35,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderWidth: 1,
    borderColor: 'white',
    backgroundColor: '#1d2088',
  },
  lineSymbolContainer: {
    width: isTablet ? (72 / 2) * 1.5 : 72 / 2,
    height: isTablet ? 48 * 1.5 : 48,
    position: 'relative',
    backgroundColor: '#1d2088',
  },
  lineSymbol: {
    color: 'white',
    fontSize: isTablet ? 22 * 1.25 : 22,
    lineHeight: isTablet ? 22 * 1.25 : 22,
    textAlign: 'center',
    fontFamily: FONTS.MyriadPro,
    position: 'absolute',
    right: 1,
    bottom: 1,
  },
  lineSymbolMedium: {
    color: 'white',
    fontSize: isTablet ? 22 * 1.25 : 22,
    lineHeight: isTablet ? 22 * 1.25 : 22,
    textAlign: 'center',
    fontFamily: FONTS.MyriadPro,
    position: 'absolute',
    right: 1,
    bottom: 1,
  },
  lineSymbolTiny: {
    color: 'white',
    fontSize: 10,
    lineHeight: 10,
    textAlign: 'center',
    fontFamily: FONTS.MyriadPro,
    marginTop: 2,
  },
  stationNumberContainer: {
    width: isTablet ? (72 / 2) * 1.5 : 72 / 2,
    height: isTablet ? 48 * 1.5 : 48,
    position: 'relative',
    backgroundColor: 'white',
  },
  stationNumber: {
    position: 'absolute',
    bottom: isTablet ? -4 : -2,
    flex: 1,
    left: 0,
    right: 0,
    color: '#1d2088',
    fontSize: isTablet ? 28 * 1.5 : 28,
    lineHeight: isTablet ? 28 * 1.5 : 28,
    textAlign: 'center',
    fontFamily: FONTS.MyriadPro,
  },
});

const NumberingIconKeihan: React.FC<Props> = ({
  stationNumber: stationNumberRaw,
  size,
  withOutline,
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = stationNumberRaw.split('-');
  const stationNumber = stationNumberRest.join('');

  if (size === NUMBERING_ICON_SIZE.SMALL) {
    return (
      <View style={styles.rootTiny}>
        <Typography style={styles.lineSymbolTiny}>{lineSymbol}</Typography>
      </View>
    );
  }

  if (size === NUMBERING_ICON_SIZE.MEDIUM) {
    return (
      <View style={styles.rootMedium}>
        <Typography style={styles.lineSymbolMedium}>{lineSymbol}</Typography>
      </View>
    );
  }

  return (
    <View style={withOutline ? styles.optionalBorder : undefined}>
      <View style={styles.root}>
        <View style={styles.lineSymbolContainer}>
          <Typography style={styles.lineSymbol}>{lineSymbol}</Typography>
        </View>
        <View style={styles.stationNumberContainer}>
          <Typography style={styles.stationNumber}>{stationNumber}</Typography>
        </View>
      </View>
    </View>
  );
};

export default NumberingIconKeihan;
