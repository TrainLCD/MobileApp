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
    width: isTablet ? 84 : 64,
    height: isTablet ? 84 : 64,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderRadius: 8,
    borderWidth: isTablet ? 6 * 1.25 : 6,
    backgroundColor: 'white',
  },
  lineSymbol: {
    lineHeight: isTablet ? 20 * 1.5 : 20,
    fontSize: isTablet ? 20 * 1.5 : 20,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
    marginTop: 4,
  },
  stationNumber: {
    lineHeight: isTablet ? 30 * 1.25 : 30,
    fontSize: isTablet ? 30 * 1.25 : 30,
    marginTop: -4,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
  },
});

const NumberingIconSquare: React.FC<Props> = ({
  fullStationNumber,
  lineColor,
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = fullStationNumber.split('-');
  const stationNumber = stationNumberRest.join('');
  return (
    <View style={[styles.root, { borderColor: lineColor }]}>
      <Text style={styles.lineSymbol}>{lineSymbol}</Text>
      <Text style={styles.stationNumber}>{stationNumber}</Text>
    </View>
  );
};

export default NumberingIconSquare;
