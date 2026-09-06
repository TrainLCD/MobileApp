import type React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { FONTS } from '../constants';
import isTablet from '../utils/isTablet';
import { numberingStackedGlyphLift } from '../utils/numberingGlyphLift';
import Typography from './Typography';

type Props = {
  stationNumber: string;
  lineColor: string;
  withOutline?: boolean;
};

const FONT = 'FrutigerNeueLTProBold';
const SYMBOL_SIZE = isTablet ? 21 * 1.5 : 21;
const NUMBER_SIZE = isTablet ? 35 * 1.5 : 35;

// Androidのグリフ下寄り補正。記号と番号で同じ値を使わないと両者の間隔が変わる
const GLYPH_LIFT = numberingStackedGlyphLift(
  { fontSize: SYMBOL_SIZE, font: FONT },
  { fontSize: NUMBER_SIZE, font: FONT }
);

const styles = StyleSheet.create({
  optionalBorder: {
    borderRadius: (isTablet ? 72 * 1.5 : 72) / 2,
    borderWidth: 2,
    borderColor: '#fff',
  },
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
    fontSize: SYMBOL_SIZE,
    lineHeight: SYMBOL_SIZE,
    transform: GLYPH_LIFT,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
    // Androidの上下ズレは GLYPH_LIFT が打ち消すので、視覚補正の marginTop は iOS のみ
    marginTop: Platform.OS === 'ios' ? (isTablet ? 4 : 2) : 0,
  },
  stationNumber: {
    fontSize: NUMBER_SIZE,
    lineHeight: NUMBER_SIZE,
    transform: GLYPH_LIFT,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
    marginTop: isTablet ? -4 : -2,
  },
});

const NumberingIconHankyu: React.FC<Props> = ({
  stationNumber: stationNumberRaw,
  lineColor,
  withOutline,
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = stationNumberRaw.split('-');
  const stationNumber = stationNumberRest.join('-');

  return (
    <View style={withOutline ? styles.optionalBorder : undefined}>
      <View style={[styles.root, { borderColor: lineColor }]}>
        <Typography style={[styles.lineSymbol, { color: lineColor }]}>
          {lineSymbol}
        </Typography>
        <Typography style={[styles.stationNumber, { color: lineColor }]}>
          {stationNumber}
        </Typography>
      </View>
    </View>
  );
};

export default NumberingIconHankyu;
