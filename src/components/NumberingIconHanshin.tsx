import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import FONTS from '../constants/fonts';
import isTablet from '../utils/isTablet';

type Props = {
  stationNumber: string;
  lineColor: string;
};

const styles = StyleSheet.create({
  root: {
    width: isTablet ? 72 * 1.5 : 72,
    height: isTablet ? 72 * 1.5 : 72,
    borderRadius: (isTablet ? 72 * 1.5 : 72) / 2,
    borderWidth: isTablet ? 4 * 1.5 : 4,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    backgroundColor: 'white',
  },
  lineSymbol: {
    fontSize: isTablet ? 21 * 1.5 : 21,
    lineHeight: isTablet ? 21 * 1.5 : 21,
    textAlign: 'center',
    fontFamily: FONTS.VerdanaBold,
    marginTop: isTablet ? 4 : 2,
  },
  stationNumber: {
    fontSize: isTablet ? 35 * 1.5 : 35,
    lineHeight: isTablet ? 35 * 1.5 : 35,
    textAlign: 'center',
    fontFamily: FONTS.VerdanaBold,
    marginTop: isTablet ? -4 : -2,
  },
});

const NumberingIconHanshin: React.FC<Props> = ({
  stationNumber: stationNumberRaw,
  lineColor,
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = stationNumberRaw.split('-');
  const stationNumber = stationNumberRest.join('-');

  return (
    <View style={[styles.root, { borderColor: lineColor }]}>
      <Text style={[styles.lineSymbol, { color: lineColor }]}>
        {lineSymbol}
      </Text>
      <Text style={[styles.stationNumber, { color: lineColor }]}>
        {stationNumber}
      </Text>
    </View>
  );
};

export default NumberingIconHanshin;
