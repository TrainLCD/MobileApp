import type React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import {
  FONTS,
  NUMBERING_ICON_SIZE,
  type NumberingIconSize,
} from '../constants';
import isTablet from '../utils/isTablet';
import { numberingGlyphLift } from '../utils/numberingGlyphLift';
import Typography from './Typography';

type Props = {
  stationNumber: string;
  lineColor: string;
  size?: NumberingIconSize;
  withOutline?: boolean;
};

const FONT = 'FuturaLTPro';

// Androidのグリフ上寄り補正。いずれも1行なのでサイズごとに求める
const GLYPH_LIFT = numberingGlyphLift(isTablet ? 24 * 1.5 : 24, FONT);
const LONG_GLYPH_LIFT = numberingGlyphLift(isTablet ? 16 * 1.5 : 16, FONT);
const MEDIUM_GLYPH_LIFT = numberingGlyphLift(isTablet ? 24 : 14, FONT);
const MEDIUM_LONG_GLYPH_LIFT = numberingGlyphLift(isTablet ? 16 : 11, FONT);
const TINY_GLYPH_LIFT = numberingGlyphLift(10, FONT);
const TINY_LONG_GLYPH_LIFT = numberingGlyphLift(5, FONT);

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
    borderWidth: isTablet ? 8 * 1.5 : 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    backgroundColor: 'white',
  },
  lineSymbol: {
    color: '#221714',
    fontSize: isTablet ? 24 * 1.5 : 24,
    lineHeight: isTablet ? 24 * 1.5 : 24,
    transform: GLYPH_LIFT,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
  },
  lineSymbolLong: {
    color: '#221714',
    fontSize: isTablet ? 16 * 1.5 : 16,
    lineHeight: isTablet ? 16 * 1.5 : 16,
    transform: LONG_GLYPH_LIFT,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
  },
  rootTiny: {
    width: 20,
    height: 20,
    borderRadius: 25.6 / 2,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    backgroundColor: 'white',
  },
  rootMedium: {
    width: isTablet ? 35 * 1.5 : 35,
    height: isTablet ? 35 * 1.5 : 35,
    borderRadius: (isTablet ? 35 * 1.5 : 35) / 2,
    borderWidth: isTablet ? 10 : 7,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    backgroundColor: 'white',
  },
  lineSymbolTiny: {
    color: '#221714',
    fontSize: 10,
    lineHeight: 10,
    transform: TINY_GLYPH_LIFT,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
    // Androidの上下ズレは GLYPH_LIFT が打ち消すので、視覚補正の marginTop は iOS のみ
    marginTop: Platform.OS === 'ios' ? 1 : 0,
  },
  lineSymbolTinyLong: {
    color: '#221714',
    fontSize: 5,
    lineHeight: 5,
    transform: TINY_LONG_GLYPH_LIFT,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
    // Androidの上下ズレは GLYPH_LIFT が打ち消すので、視覚補正の marginTop は iOS のみ
    marginTop: Platform.OS === 'ios' ? 1 : 0,
  },
  lineSymbolMedium: {
    color: '#221714',
    fontSize: isTablet ? 24 : 14,
    lineHeight: isTablet ? 24 : 14,
    transform: MEDIUM_GLYPH_LIFT,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
    // Androidの上下ズレは GLYPH_LIFT が打ち消すので、視覚補正の marginTop は iOS のみ
    marginTop: Platform.OS === 'ios' ? 2 : 0,
  },
  lineSymbolMediumLong: {
    color: '#221714',
    fontSize: isTablet ? 16 : 11,
    lineHeight: isTablet ? 16 : 11,
    transform: MEDIUM_LONG_GLYPH_LIFT,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
    // Androidの上下ズレは GLYPH_LIFT が打ち消すので、視覚補正の marginTop は iOS のみ
    marginTop: Platform.OS === 'ios' ? 2 : 0,
    alignSelf: 'center',
  },
});

const NumberingIconRoundHorizontal: React.FC<Props> = ({
  stationNumber: stationNumberRaw,
  lineColor,
  size,
  withOutline,
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = stationNumberRaw.split('-');
  const stationNumber = stationNumberRest.join('-');

  if (size === NUMBERING_ICON_SIZE.SMALL) {
    return (
      <View style={[styles.rootTiny, { borderColor: lineColor }]}>
        <Typography
          style={
            lineSymbol.length > 1
              ? styles.lineSymbolTinyLong
              : styles.lineSymbolTiny
          }
        >
          {lineSymbol}
        </Typography>
      </View>
    );
  }

  if (size === NUMBERING_ICON_SIZE.MEDIUM) {
    return (
      <View style={[styles.rootMedium, { borderColor: lineColor }]}>
        <Typography
          style={
            lineSymbol.length > 1
              ? styles.lineSymbolMediumLong
              : styles.lineSymbolMedium
          }
        >
          {lineSymbol}
        </Typography>
      </View>
    );
  }

  return (
    <View style={withOutline ? styles.optionalBorder : undefined}>
      <View style={[styles.root, { borderColor: lineColor }]}>
        <Typography
          style={
            lineSymbol.length === 2 ? styles.lineSymbolLong : styles.lineSymbol
          }
        >
          {lineSymbol}
          {stationNumber}
        </Typography>
      </View>
    </View>
  );
};

export default NumberingIconRoundHorizontal;
