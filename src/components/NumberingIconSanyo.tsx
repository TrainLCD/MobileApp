import type React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import {
  FONTS,
  NUMBERING_ICON_SIZE,
  type NumberingIconSize,
} from '../constants';
import isTablet from '../utils/isTablet';
import {
  numberingGlyphLift,
  numberingStackedGlyphLift,
} from '../utils/numberingGlyphLift';
import Typography from './Typography';

type Props = {
  stationNumber: string;
  lineColor: string;
  size?: NumberingIconSize;
  withOutline?: boolean;
};

const FONT = 'FrutigerNeueLTProBold';
const SYMBOL_SIZE = isTablet ? 20 * 1.5 : 20;
const NUMBER_SIZE = isTablet ? 35 * 1.5 : 35;
const SMALL_SYMBOL_SIZE = isTablet ? 18 * 1.5 : 18;

// Androidのグリフ下寄り補正。記号と番号で異なる値を使うと両者の間隔まで変わるため、
// 縦に並ぶ2行には同じ値を使い回す
const GLYPH_LIFT = numberingStackedGlyphLift(
  { fontSize: SYMBOL_SIZE, font: FONT },
  { fontSize: NUMBER_SIZE, font: FONT }
);
const SMALL_GLYPH_LIFT = numberingGlyphLift(SMALL_SYMBOL_SIZE, FONT);
const TINY_GLYPH_LIFT = numberingGlyphLift(10, FONT);

const styles = StyleSheet.create({
  optionalBorder: {
    borderRadius: (isTablet ? 72 * 1.5 : 72) / 2,
    borderWidth: 2,
    borderColor: '#fff',
  },
  root: {
    borderWidth: isTablet ? 4 : 2,
    width: isTablet ? 72 * 1.5 : 72,
    height: isTablet ? 72 * 1.5 : 72,
    borderRadius: isTablet ? 72 * 1.5 : 72,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inner: {
    width: isTablet ? 66 * 1.5 : 66,
    height: isTablet ? 66 * 1.5 : 66,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderRadius: isTablet ? 70 * 1.5 : 70,
    borderWidth: 1,
    borderColor: 'white',
  },
  lineSymbol: {
    color: 'white',
    fontSize: SYMBOL_SIZE,
    lineHeight: SYMBOL_SIZE,
    transform: GLYPH_LIFT,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
    // Androidの上下ズレは GLYPH_LIFT が打ち消すので、視覚補正の marginTop は iOS のみ
    marginTop: Platform.OS === 'ios' ? (isTablet ? 4 * 1.2 : 4) : 0,
  },
  rootTiny: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16.8,
    borderWidth: 1,
  },
  tinyInner: {
    width: 21.6,
    height: 21.6,
    borderRadius: 21.6 / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rootSmall: {
    width: isTablet ? 38 * 1.5 : 38,
    height: isTablet ? 38 * 1.5 : 38,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderRadius: isTablet ? 38 * 1.5 : 38,
    borderWidth: isTablet ? 2 : 1,
    borderColor: 'white',
  },
  smallInner: {
    width: isTablet ? 33 * 1.5 : 33,
    height: isTablet ? 33 * 1.5 : 33,
    borderRadius: (isTablet ? 33 * 1.5 : 33) / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lineSymbolTiny: {
    color: 'white',
    fontSize: 10,
    lineHeight: 10,
    transform: TINY_GLYPH_LIFT,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
    // Androidの上下ズレは GLYPH_LIFT が打ち消すので、視覚補正の marginTop は iOS のみ
    marginTop: Platform.OS === 'ios' ? 2 : 0,
  },
  lineSymbolSmall: {
    color: 'white',
    fontSize: SMALL_SYMBOL_SIZE,
    lineHeight: SMALL_SYMBOL_SIZE,
    transform: SMALL_GLYPH_LIFT,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
    // Androidの上下ズレは GLYPH_LIFT が打ち消すので、視覚補正の marginTop は iOS のみ
    marginTop: Platform.OS === 'ios' ? (isTablet ? 6 : 4) : 0,
  },
  stationNumber: {
    color: 'white',
    fontSize: NUMBER_SIZE,
    lineHeight: NUMBER_SIZE,
    transform: GLYPH_LIFT,
    marginTop: isTablet ? -2 * 1.2 : -2,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
  },
});

const NumberingIconSanyo: React.FC<Props> = ({
  stationNumber: stationNumberRaw,
  lineColor,
  size,
  withOutline,
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = stationNumberRaw.split('-');
  const stationNumber = stationNumberRest.join('');

  if (size === NUMBERING_ICON_SIZE.SMALL) {
    return (
      <View style={[styles.rootTiny, { borderColor: lineColor }]}>
        <View style={[styles.tinyInner, { backgroundColor: lineColor }]}>
          <Typography style={styles.lineSymbolTiny}>{lineSymbol}</Typography>
        </View>
      </View>
    );
  }

  if (size === NUMBERING_ICON_SIZE.MEDIUM) {
    return (
      <View style={[styles.rootSmall, { borderColor: lineColor }]}>
        <View style={[styles.smallInner, { backgroundColor: lineColor }]}>
          <Typography style={styles.lineSymbolSmall}>{lineSymbol}</Typography>
        </View>
      </View>
    );
  }

  return (
    <View style={withOutline ? styles.optionalBorder : undefined}>
      <View style={[styles.root, { borderColor: lineColor }]}>
        <View style={[styles.inner, { backgroundColor: lineColor }]}>
          <Typography style={styles.lineSymbol}>{lineSymbol}</Typography>
          <Typography style={styles.stationNumber}>{stationNumber}</Typography>
        </View>
      </View>
    </View>
  );
};

export default NumberingIconSanyo;
