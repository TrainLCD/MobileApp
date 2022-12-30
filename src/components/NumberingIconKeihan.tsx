import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import FONTS from '../constants/fonts';
import { NumberingIconSize, NUMBERING_ICON_SIZE } from '../constants/numbering';
import isTablet from '../utils/isTablet';

type Props = {
  stationNumber: string;
  lineColor: string;
  size?: NumberingIconSize;
};

const styles = StyleSheet.create({
  root: {
    width: isTablet ? 72 * 1.5 : 72,
    height: isTablet ? 48 * 1.5 : 48,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#1d2088',
  },
  rootTiny: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderWidth: 1,
    borderColor: 'white',
  },
  rootSmall: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderWidth: 1,
    borderColor: 'white',
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
  lineColor,
  size,
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = stationNumberRaw.split('-');
  const stationNumber = stationNumberRest.join('');

  if (size === NUMBERING_ICON_SIZE.TINY) {
    return (
      <View style={[styles.rootTiny, { backgroundColor: lineColor }]}>
        <Text style={styles.lineSymbolTiny}>{lineSymbol}</Text>
      </View>
    );
  }

  if (size === NUMBERING_ICON_SIZE.SMALL) {
    return (
      <View style={[styles.rootSmall, { backgroundColor: lineColor }]}>
        <Text style={styles.lineSymbol}>{lineSymbol}</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.lineSymbolContainer}>
        <Text style={styles.lineSymbol}>{lineSymbol}</Text>
      </View>
      <View style={styles.stationNumberContainer}>
        <Text style={styles.stationNumber}>{stationNumber}</Text>
      </View>
    </View>
  );
};

NumberingIconKeihan.defaultProps = {
  size: NUMBERING_ICON_SIZE.DEFAULT,
};

export default NumberingIconKeihan;
