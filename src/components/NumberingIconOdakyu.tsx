import type React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { FONTS } from '../constants';
import isTablet from '../utils/isTablet';
import Typography from './Typography';

type Props = {
  stationNumber: string;
  hakone: boolean;
  withOutline?: boolean;
  shouldGrayscale?: boolean;
};

const styles = StyleSheet.create({
  optionalBorder: {
    borderRadius: (isTablet ? 72 * 1.5 : 72) / 2.2 + 2,
    borderWidth: 2,
    borderColor: '#fff',
  },
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
    marginTop: Platform.select({ android: -2, ios: 8 }),
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

const GRAYSCALE_COLOR = '#aaa';

const NumberingIconOdakyu: React.FC<Props> = ({
  stationNumber: stationNumberRaw,
  hakone,
  withOutline,
  shouldGrayscale,
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = stationNumberRaw.split('-');
  const stationNumber = stationNumberRest.join('');

  const borderColor = shouldGrayscale
    ? GRAYSCALE_COLOR
    : hakone
      ? '#EA4D15'
      : '#0D82C7';
  const textColor = shouldGrayscale
    ? GRAYSCALE_COLOR
    : hakone
      ? '#6A3906'
      : '#0D82C7';

  return (
    <View style={withOutline ? styles.optionalBorder : undefined}>
      <View style={[styles.root, { borderColor }]}>
        <Typography style={[styles.lineSymbol, { color: textColor }]}>
          {lineSymbol}
        </Typography>
        <Typography style={[styles.stationNumber, { color: textColor }]}>
          {stationNumber}
        </Typography>
      </View>
    </View>
  );
};

export default NumberingIconOdakyu;
