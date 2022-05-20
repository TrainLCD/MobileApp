import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import FONTS from '../constants/fonts';
import isTablet from '../utils/isTablet';

type Props = {
  stationNumber: string;
  lineColor: string;
  small?: boolean;
};

const styles = StyleSheet.create({
  root: {
    width: isTablet ? 72 * 1.5 : 72,
    height: isTablet ? 72 * 1.5 : 72,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderRadius: isTablet ? 64 * 1.5 : 64,
    borderWidth: 1,
    borderColor: 'white',
  },
  lineSymbol: {
    color: 'white',
    fontSize: isTablet ? 22 * 1.5 : 22,
    lineHeight: isTablet ? 22 * 1.5 : 22,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
  },
  rootSmall: {
    width: isTablet ? 38 * 1.5 : 38,
    height: isTablet ? 38 * 1.5 : 38,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderRadius: isTablet ? 64 * 1.5 : 64,
    borderWidth: 1,
    borderColor: 'white',
  },
  lineSymbolSmall: {
    color: 'white',
    fontSize: isTablet ? 22 * 0.75 * 1.5 : 22 * 0.75,
    lineHeight: isTablet ? 22 * 0.75 * 1.5 : 22 * 0.75,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
    marginTop: isTablet ? 4 : 2,
  },
  stationNumber: {
    color: 'white',
    fontSize: isTablet ? 35 * 1.5 : 35,
    lineHeight: isTablet ? 35 * 1.5 : 35,
    marginTop: isTablet ? -4 * 1.2 : -4,
    textAlign: 'center',
    fontFamily: FONTS.MyriadPro,
  },
});

const NumberingIconReversedRound: React.FC<Props> = ({
  stationNumber: stationNumberRaw,
  lineColor,
  small,
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = stationNumberRaw.split('-');
  const stationNumber = stationNumberRest.join('');

  if (small) {
    return (
      <View style={[styles.rootSmall, { backgroundColor: lineColor }]}>
        <Text style={styles.lineSymbolSmall}>{lineSymbol}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { borderColor: lineColor }]}>
      <Text style={styles.lineSymbol}>{lineSymbol}</Text>
      <Text style={styles.stationNumber}>{stationNumber}</Text>
    </View>
  );
};

NumberingIconReversedRound.defaultProps = {
  small: false,
};

export default NumberingIconReversedRound;
