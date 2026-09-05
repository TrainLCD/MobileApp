import type React from 'react';
import { StyleSheet, View } from 'react-native';
import { FONTS } from '../constants';
import isTablet from '../utils/isTablet';
import { numberingStackedGlyphLift } from '../utils/numberingGlyphLift';
import Typography from './Typography';

type Props = {
  stationNumber: string;
  withOutline?: boolean;
};

const FONT = 'FrutigerNeueLTProBold';
const SYMBOL_SIZE = isTablet ? 18 * 1.5 : 18;
const NUMBER_SIZE = isTablet ? 28 * 1.5 : 28;

// Androidのグリフ下寄り補正。記号と番号で同じ値を使わないと両者の間隔が変わる。
// inner は上詰めで中央寄せしていないため marginTop は位置指定そのものと解釈し、
// プラットフォーム分岐は入れずフォント由来のズレだけを打ち消す
const GLYPH_LIFT = numberingStackedGlyphLift(
  { fontSize: SYMBOL_SIZE, font: FONT },
  { fontSize: NUMBER_SIZE, font: FONT }
);

const styles = StyleSheet.create({
  optionalBorder: {
    borderRadius: isTablet ? 14 : 10,
    borderWidth: 2,
    borderColor: '#fff',
  },
  root: {
    width: isTablet ? 72 * 1.5 : 72,
    height: isTablet ? 72 * 1.5 : 72,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderRadius: isTablet ? 12 : 8,
    borderWidth: isTablet ? 7 * 1.5 : 7,
    backgroundColor: 'white',
    borderColor: '#d53a77',
  },
  inner: {
    borderColor: '#69b444',
    borderWidth: (isTablet ? 7 * 1.5 : 7) * 0.5,
    width: isTablet ? 51 * 1.5 : 51,
    height: isTablet ? 51 * 1.5 : 51,
    borderRadius: isTablet ? 6 : 4,
  },
  lineSymbol: {
    lineHeight: SYMBOL_SIZE,
    fontSize: SYMBOL_SIZE,
    transform: GLYPH_LIFT,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
    marginTop: 4,
  },
  stationNumber: {
    lineHeight: NUMBER_SIZE,
    fontSize: NUMBER_SIZE,
    transform: GLYPH_LIFT,
    marginTop: -4,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
  },
});

const NumberingIconNTL: React.FC<Props> = ({
  stationNumber: stationNumberRaw,
  withOutline,
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = stationNumberRaw.split('-');
  const stationNumber = stationNumberRest.join('');

  return (
    <View style={withOutline ? styles.optionalBorder : undefined}>
      <View style={styles.root}>
        <View style={styles.inner}>
          <Typography style={styles.lineSymbol}>{lineSymbol}</Typography>
          <Typography style={styles.stationNumber}>{stationNumber}</Typography>
        </View>
      </View>
    </View>
  );
};

export default NumberingIconNTL;
