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
    height: isTablet ? 72 * 1.5 : 72,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: isTablet ? 72 * 1.5 : 72,
    borderWidth: 1,
    borderColor: 'white',
  },
  rootTiny: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16.8,
    borderWidth: 1,
    borderColor: 'white',
  },
  rootSmall: {
    width: isTablet ? 38 * 1.5 : 38,
    height: isTablet ? 38 * 1.5 : 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: isTablet ? 38 * 1.5 : 38,
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
  lineSymbolSmall: {
    color: 'white',
    fontSize: isTablet ? 21 * 1.5 : 21,
    lineHeight: isTablet ? 21 * 1.5 : 21,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
    marginTop: isTablet ? 4 : 2,
  },
  stationNumber: {
    color: 'white',
    fontSize: isTablet ? 24 * 1.5 : 24,
    lineHeight: isTablet ? 24 * 1.5 : 24,
    textAlign: 'center',
    fontFamily: FONTS.MyriadPro,
    marginTop: isTablet ? 4 : 2,
  },
});

const NumberingIconReversedRoundHorizontal: React.FC<Props> = ({
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
        <Text style={styles.lineSymbolSmall}>{lineSymbol}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: lineColor }]}>
      <Text style={styles.stationNumber}>
        {lineSymbol}
        {stationNumber}
      </Text>
    </View>
  );
};

NumberingIconReversedRoundHorizontal.defaultProps = {
  size: NUMBERING_ICON_SIZE.DEFAULT,
};

export default NumberingIconReversedRoundHorizontal;
