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
    width: isTablet ? 84 : 64,
    height: isTablet ? 84 : 64,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderRadius: 8,
    borderWidth: 6,
    backgroundColor: 'white',
  },
  lineSymbol: {
    lineHeight: RFValue(19),
    fontSize: RFValue(18),
    textAlign: 'center',
    fontFamily: 'Frutiger Neue LT Pro',
  },
  stationNumber: {
    lineHeight: RFValue(25),
    fontSize: RFValue(24),
    marginTop: -4,
    textAlign: 'center',
    fontFamily: 'Frutiger Neue LT Pro',
  },
});

const NumberingIconSquare: React.FC<Props> = ({
  fullStationNumber,
  lineColor,
  size = 'normal',
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

NumberingIconSquare.defaultProps = {
  size: undefined,
};

export default NumberingIconSquare;
