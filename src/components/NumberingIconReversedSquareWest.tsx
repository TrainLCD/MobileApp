import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RFValue } from 'react-native-responsive-fontsize';
import { CommonNumberingIconSize } from '../constants/numbering';
import isTablet from '../utils/isTablet';

type Props = {
  fullStationNumber: string;
  lineColor: string;
  size?: CommonNumberingIconSize;
};

const styles = StyleSheet.create({
  root: {
    width: isTablet ? 64 * 1.5 : 64,
    height: isTablet ? 64 * 1.5 : 64,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderColor: 'white',
  },
  lineSymbol: {
    color: 'white',
    fontSize: isTablet ? RFValue(21 * 1.2) : RFValue(25),
    lineHeight: isTablet ? RFValue(21 * 1.2) : RFValue(25),
    textAlign: 'center',
    fontFamily: 'Frutiger Neue LT Pro',
    marginTop: 4,
  },
  stationNumber: {
    color: 'white',
    fontSize: isTablet ? RFValue(25 * 1.2) : RFValue(25),
    lineHeight: isTablet ? RFValue(25 * 1.2) : RFValue(25),
    textAlign: 'center',
    fontFamily: 'Frutiger Neue LT Pro',
  },
});

const NumberingIconReversedSquareWest: React.FC<Props> = ({
  fullStationNumber,
  lineColor,
  size = 'normal',
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

NumberingIconReversedSquareWest.defaultProps = {
  size: undefined,
};

export default NumberingIconReversedSquareWest;
