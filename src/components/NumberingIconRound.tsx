import React, { useMemo } from 'react';
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

const FONT = 'FuturaLTPro';
const SYMBOL_SIZE = isTablet ? 24 * 1.5 : 24;
const LONG_SYMBOL_SIZE = isTablet ? 20 * 1.5 : 20;
const NUMBER_SIZE = isTablet ? 26 * 1.5 : 26;

// Androidのグリフ上寄り補正。記号と番号で異なる値を使うと両者の間隔まで変わるため、
// 縦に並ぶ2行には同じ値を使い回す
const GLYPH_LIFT = numberingStackedGlyphLift(
  { fontSize: SYMBOL_SIZE, font: FONT },
  { fontSize: NUMBER_SIZE, font: FONT }
);
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
    fontSize: SYMBOL_SIZE,
    lineHeight: SYMBOL_SIZE,
    transform: GLYPH_LIFT,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
  },
  lineSymbolLong: {
    color: '#221714',
    fontSize: LONG_SYMBOL_SIZE,
    lineHeight: LONG_SYMBOL_SIZE,
    transform: GLYPH_LIFT,
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
  stationNumber: {
    color: '#221714',
    fontSize: NUMBER_SIZE,
    lineHeight: NUMBER_SIZE,
    transform: GLYPH_LIFT,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
    marginTop: isTablet ? -4 : -2,
  },
  longStationNumberAdditional: {
    fontSize: isTablet ? 20 * 1.5 : 20,
    letterSpacing: -2,
  },
});

const NumberingIconRound: React.FC<Props> = ({
  stationNumber: stationNumberRaw,
  lineColor,
  size,
  withOutline,
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = stationNumberRaw.split('-');
  const stationNumber = stationNumberRest.join('-');
  const isIncludesSubNumber = stationNumber.includes('-');
  const stationNumberTextStyles = useMemo(() => {
    if (isIncludesSubNumber) {
      return [styles.stationNumber, styles.longStationNumberAdditional];
    }
    return styles.stationNumber;
  }, [isIncludesSubNumber]);

  if (size === NUMBERING_ICON_SIZE.SMALL) {
    return (
      <View style={[styles.rootTiny, { borderColor: lineColor }]}>
        <Typography
          style={
            lineSymbol.length === 2
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
            lineSymbol.length === 2
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
        </Typography>
        {stationNumber ? (
          <Typography style={stationNumberTextStyles}>
            {stationNumber}
          </Typography>
        ) : null}
      </View>
    </View>
  );
};

export default React.memo(NumberingIconRound);
