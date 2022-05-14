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
    borderRadius: isTablet ? 64 * 1.5 : 64,
    borderWidth: 1,
    borderColor: 'white',
  },
  lineSymbol: {
    color: 'white',
    fontSize: isTablet ? RFValue(18 * 1.2) : RFValue(18),
    lineHeight: isTablet ? RFValue(18 * 1.2) : RFValue(18),
    textAlign: 'center',
    fontFamily: 'Myriad Pro',
    marginTop: 4,
  },
  stationNumber: {
    color: 'white',
    fontSize: isTablet ? RFValue(30 * 1.2) : RFValue(30),
    lineHeight: isTablet ? RFValue(30 * 1.2) : RFValue(30),
    marginTop: isTablet ? -4 * 1.2 : -4,
    textAlign: 'center',
    fontFamily: 'Myriad Pro',
  },
});

const NumberingIconReversedRound: React.FC<Props> = ({
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

NumberingIconReversedRound.defaultProps = {
  size: undefined,
};

export default NumberingIconReversedRound;
