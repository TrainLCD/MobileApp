import type React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { FONTS } from '../constants';
import isTablet from '../utils/isTablet';
import Typography from './Typography';

type Props = {
  stationNumber: string;
  hakone: boolean;
};

const styles = StyleSheet.create({
  root: {
    width: isTablet ? 72 * 1.5 : 72,
    height: isTablet ? 72 * 1.5 : 72,
    borderRadius: (isTablet ? 72 * 1.5 : 72) / 2.2,
    borderWidth: isTablet ? 6 * 1.5 : 6,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    backgroundColor: 'white',
  },
  lineSymbol: {
    color: '#221714',
    fontSize: isTablet ? 22 * 1.5 : 22,
    lineHeight: isTablet ? 22 * 1.5 : 22,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
    marginTop: Platform.select({ android: -2, ios: -4 }),
    letterSpacing: -1,
  },
  stationNumber: {
    color: '#221714',
    fontSize: isTablet ? 32 * 1.5 : 32,
    lineHeight: isTablet ? 32 * 1.5 : 32,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
    marginTop: isTablet ? -4 : -2,
    letterSpacing: -1,
  },
});

const NumberingIconOdakyu: React.FC<Props> = ({
  stationNumber: stationNumberRaw,
  hakone,
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = stationNumberRaw.split('-');
  const stationNumber = stationNumberRest.join('');

  return (
    <View
      style={[styles.root, { borderColor: hakone ? '#EA4D15' : '#0D82C7' }]}
    >
      <Typography
        style={[styles.lineSymbol, { color: hakone ? '#6A3906' : '#0D82C7' }]}
      >
        {lineSymbol}
      </Typography>
      <Typography
        style={[
          styles.stationNumber,
          { color: hakone ? '#6A3906' : '#0D82C7' },
        ]}
      >
        {stationNumber}
      </Typography>
    </View>
  );
};

export default NumberingIconOdakyu;
