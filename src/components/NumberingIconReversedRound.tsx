import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import FONTS from '../constants/fonts';
import isTablet from '../utils/isTablet';

type Props = {
  fullStationNumber: string;
  lineColor: string;
};

const styles = StyleSheet.create({
  root: {
    width: isTablet ? 64 * 1.5 : 64,
    height: isTablet ? 64 * 1.5 : 64,
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
    fontFamily: FONTS.MyriadPro,
    marginTop: 4,
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
  fullStationNumber,
  lineColor,
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = fullStationNumber.split('-');
  const stationNumber = stationNumberRest.join('');

  return (
    <View style={[styles.root, { backgroundColor: lineColor }]}>
      <Text style={styles.lineSymbol}>{lineSymbol}</Text>
      <Text style={styles.stationNumber}>{stationNumber}</Text>
    </View>
  );
};

export default NumberingIconReversedRound;
