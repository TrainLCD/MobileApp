import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RFValue } from 'react-native-responsive-fontsize';
import FONTS from '../constants/fonts';
import { CommonNumberingIconSize } from '../constants/numbering';
import isTablet from '../utils/isTablet';

type Props = {
  fullStationNumber: string;
  lineColor: string;
  size?: CommonNumberingIconSize;
};

const styles = StyleSheet.create({
  root: {
    width: isTablet ? 72 * 1.5 : 72,
    height: isTablet ? 72 * 1.5 : 72,
    borderRadius: (isTablet ? 72 * 1.5 : 72) / 2.25,
    borderWidth: isTablet ? 6 * 1.5 : 6,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    backgroundColor: 'white',
  },
  lineSymbol: {
    color: '#221714',
    fontSize: isTablet ? RFValue(18 * 1.2) : RFValue(18),
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
    marginTop: -4,
    letterSpacing: -1,
  },
  stationNumber: {
    color: '#221714',
    fontSize: isTablet ? RFValue(21 * 1.2) : RFValue(21),
    lineHeight: isTablet ? RFValue(21 * 1.2) : RFValue(21),
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
    marginTop: -4,
    letterSpacing: -1,
  },
});

const NumberingIconOdakyu: React.FC<Props> = ({
  fullStationNumber,
  lineColor,
  size = 'normal',
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = fullStationNumber.split('-');
  const stationNumber = stationNumberRest.join('');

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

NumberingIconOdakyu.defaultProps = {
  size: undefined,
};

export default NumberingIconOdakyu;
