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
  darkText?: boolean;
  withOutline?: boolean;
};

const FONT = 'MyriadPro';
const SYMBOL_SIZE = isTablet ? 22 * 1.5 : 22;
const NUMBER_SIZE = isTablet ? 37 * 1.5 : 35;
const MEDIUM_SIZE = isTablet ? 18 * 1.5 : 18;

// Androidのグリフ上寄り補正。記号と番号で異なる値を使うと両者の間隔まで変わるため、
// 縦に並ぶ2行には同じ値を使い回す
const GLYPH_LIFT = numberingStackedGlyphLift(
  { fontSize: SYMBOL_SIZE, font: FONT },
  { fontSize: NUMBER_SIZE, font: FONT }
);
const MEDIUM_GLYPH_LIFT = numberingGlyphLift(MEDIUM_SIZE, FONT);
const TINY_GLYPH_LIFT = numberingGlyphLift(10, FONT);

const styles = StyleSheet.create({
  optionalBorder: {
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 8,
  },
  root: {
    width: isTablet ? 64 * 1.5 : 64,
    height: isTablet ? 64 * 1.5 : 64,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderRadius: isTablet ? 8 * 1.5 : 8,
    borderWidth: 1,
    borderColor: 'white',
  },
  rootTiny: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'white',
  },
  rootMedium: {
    width: isTablet ? 35 * 1.5 : 35,
    height: isTablet ? 35 * 1.5 : 35,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'white',
  },
  lineSymbol: {
    fontSize: SYMBOL_SIZE,
    lineHeight: SYMBOL_SIZE,
    transform: GLYPH_LIFT,
    textAlign: 'center',
    fontFamily: FONTS.MyriadPro,
    // Androidの上下ズレは GLYPH_LIFT が打ち消すので、視覚補正の marginTop は iOS のみ
    marginTop: Platform.OS === 'ios' ? 4 : 0,
  },
  lineSymbolMedium: {
    fontSize: MEDIUM_SIZE,
    lineHeight: MEDIUM_SIZE,
    transform: MEDIUM_GLYPH_LIFT,
    textAlign: 'center',
    fontFamily: FONTS.MyriadPro,
    // Androidの上下ズレは GLYPH_LIFT が打ち消すので、視覚補正の marginTop は iOS のみ
    marginTop: Platform.OS === 'ios' ? 2 : 0,
  },
  lineSymbolTiny: {
    fontSize: 10,
    lineHeight: 10,
    transform: TINY_GLYPH_LIFT,
    textAlign: 'center',
    fontFamily: FONTS.MyriadPro,
    // Androidの上下ズレは GLYPH_LIFT が打ち消すので、視覚補正の marginTop は iOS のみ
    marginTop: Platform.OS === 'ios' ? 2 : 0,
  },
  stationNumber: {
    fontSize: NUMBER_SIZE,
    lineHeight: NUMBER_SIZE,
    transform: GLYPH_LIFT,
    marginTop: isTablet ? -4 * 1.2 : -4,
    textAlign: 'center',
    fontFamily: FONTS.MyriadPro,
  },
});

const NumberingIconReversedSquare: React.FC<Props> = ({
  stationNumber: stationNumberRaw,
  lineColor,
  size,
  darkText,
  withOutline,
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = stationNumberRaw.split('-');
  const stationNumber = stationNumberRest.join('');

  if (size === NUMBERING_ICON_SIZE.SMALL) {
    return (
      <View style={[styles.rootTiny, { backgroundColor: lineColor }]}>
        <Typography
          style={[
            styles.lineSymbolTiny,
            { color: darkText ? '#241f20' : 'white' },
          ]}
        >
          {lineSymbol}
        </Typography>
      </View>
    );
  }

  if (size === NUMBERING_ICON_SIZE.MEDIUM) {
    return (
      <View style={[styles.rootMedium, { backgroundColor: lineColor }]}>
        <Typography
          style={[
            styles.lineSymbolMedium,
            { color: darkText ? '#241f20' : 'white' },
          ]}
        >
          {lineSymbol}
        </Typography>
      </View>
    );
  }

  return (
    <View style={withOutline ? styles.optionalBorder : undefined}>
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
    </View>
  );
};

export default NumberingIconReversedSquare;
