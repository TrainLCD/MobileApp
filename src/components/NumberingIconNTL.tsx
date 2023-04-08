import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import FONTS from '../constants/fonts';
import isTablet from '../utils/isTablet';

type Props = {
  stationNumber: string;
};

const styles = StyleSheet.create({
  root: {
    width: isTablet ? 72 * 1.5 : 72,
    height: isTablet ? 72 * 1.5 : 72,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderRadius: isTablet ? 12 : 8,
    borderWidth: isTablet ? 7 * 1.5 : 7,
    backgroundColor: 'white',
    borderColor: '#d53a77',
  },
  inner: {
    borderColor: '#69b444',
    borderWidth: (isTablet ? 7 * 1.5 : 7) * 0.5,
    width: isTablet ? 51 * 1.5 : 51,
    height: isTablet ? 51 * 1.5 : 51,
    borderRadius: isTablet ? 6 : 4,
  },
  lineSymbol: {
    lineHeight: isTablet ? 18 * 1.5 : 18,
    fontSize: isTablet ? 18 * 1.5 : 18,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
    marginTop: 4,
  },
  stationNumber: {
    lineHeight: isTablet ? 28 * 1.5 : 28,
    fontSize: isTablet ? 28 * 1.5 : 28,
    marginTop: -4,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
  },
});

const NumberingIconNTL: React.FC<Props> = ({
  stationNumber: stationNumberRaw,
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = stationNumberRaw.split('-');
  const stationNumber = stationNumberRest.join('');

  return (
    <View style={styles.root}>
      <View style={styles.inner}>
        <Text style={styles.lineSymbol}>{lineSymbol}</Text>
        <Text style={styles.stationNumber}>{stationNumber}</Text>
      </View>
    </View>
  );
};

export default NumberingIconNTL;
