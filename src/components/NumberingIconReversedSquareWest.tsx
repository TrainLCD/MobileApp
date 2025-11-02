import type React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { FONTS } from '../constants';
import isTablet from '../utils/isTablet';
import Typography from './Typography';

type Props = {
  stationNumber: string;
  lineColor: string;

  darkText?: boolean;
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
    fontSize: isTablet ? 30 * 1.5 : 30,
    lineHeight: isTablet ? 30 * 1.5 : 30,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
    marginTop: Platform.OS === 'ios' ? 4 : 0,
  },
  stationNumber: {
    marginTop: -4,
    fontSize: isTablet ? 30 * 1.5 : 30,
    lineHeight: isTablet ? 30 * 1.5 : 30,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
  },
});

const NumberingIconReversedSquareWest: React.FC<Props> = ({
  stationNumber: stationNumberRaw,
  lineColor,
  darkText,
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = stationNumberRaw.split('-');
  const stationNumber = stationNumberRest.join('');

  return (
    <View style={[styles.root, { backgroundColor: lineColor }]}>
      <Typography
        style={[styles.lineSymbol, { color: darkText ? '#241f20' : 'white' }]}
      >
        {lineSymbol}
      </Typography>
      <Typography
        style={[
          styles.stationNumber,
          { color: darkText ? '#241f20' : 'white' },
        ]}
      >
        {stationNumber}
      </Typography>
    </View>
  );
};

export default NumberingIconReversedSquareWest;
