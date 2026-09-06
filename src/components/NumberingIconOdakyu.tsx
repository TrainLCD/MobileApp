import type React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { FONTS } from '../constants';
import isTablet from '../utils/isTablet';
import { numberingStackedGlyphLift } from '../utils/numberingGlyphLift';
import Typography from './Typography';

type Props = {
  stationNumber: string;
  hakone: boolean;
  withOutline?: boolean;
  shouldGrayscale?: boolean;
};

const FONT = 'FrutigerNeueLTProBold';
const SYMBOL_SIZE = isTablet ? 22 * 1.5 : 22;
const NUMBER_SIZE = isTablet ? 32 * 1.5 : 32;

// Androidのグリフ下寄り補正。記号と番号で同じ値を使わないと両者の間隔が変わる
const GLYPH_LIFT = numberingStackedGlyphLift(
  { fontSize: SYMBOL_SIZE, font: FONT },
  { fontSize: NUMBER_SIZE, font: FONT }
);

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
    fontSize: SYMBOL_SIZE,
    lineHeight: SYMBOL_SIZE,
    transform: GLYPH_LIFT,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
    // Androidの下ズレは GLYPH_LIFT が打ち消すので、視覚補正の marginTop は iOS のみ
    marginTop: Platform.select({ android: 0, ios: 8 }),
    letterSpacing: -1,
  },
  stationNumber: {
    color: '#221714',
    fontSize: NUMBER_SIZE,
    lineHeight: NUMBER_SIZE,
    transform: GLYPH_LIFT,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
    marginTop: isTablet ? -4 : -2,
    letterSpacing: -1,
  },
});

const BLACK_COLOR = '#000';

const NumberingIconOdakyu: React.FC<Props> = ({
  stationNumber: stationNumberRaw,
  hakone,
  withOutline,
  shouldGrayscale,
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = stationNumberRaw.split('-');
  const stationNumber = stationNumberRest.join('');

  const borderColor = shouldGrayscale
    ? BLACK_COLOR
    : hakone
      ? '#EA4D15'
      : '#0D82C7';
  const textColor = shouldGrayscale
    ? BLACK_COLOR
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
