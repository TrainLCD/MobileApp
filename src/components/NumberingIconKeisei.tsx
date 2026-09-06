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

const FONT = 'FrutigerNeueLTProBold';
const SYMBOL_SIZE = isTablet ? 22 * 1.5 : 22;
const NUMBER_SIZE = isTablet ? 26 * 1.5 : 26;

// Androidのグリフ下寄り補正。記号と番号で異なる値を使うと両者の間隔まで変わるため、
// 縦に並ぶ2行には同じ値を使い回す
const glyphLiftStyles = StyleSheet.create({
  normal: {
    transform: numberingStackedGlyphLift(
      { fontSize: SYMBOL_SIZE, font: FONT },
      { fontSize: NUMBER_SIZE, font: FONT }
    ),
  },
  // longStationNumberAdditional は fontSize だけを縮め lineHeight は据え置くので、
  // 行の高さは NUMBER_SIZE のまま
  longNumber: {
    transform: numberingStackedGlyphLift(
      { fontSize: SYMBOL_SIZE, font: FONT },
      {
        fontSize: isTablet ? 20 * 1.5 : 20,
        lineHeight: NUMBER_SIZE,
        font: FONT,
      }
    ),
  },
});
const TINY_GLYPH_LIFT = numberingGlyphLift(10, FONT);

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
    fontSize: SYMBOL_SIZE,
    lineHeight: SYMBOL_SIZE,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
    // Androidの上下ズレは GLYPH_LIFT が打ち消すので、視覚補正の marginTop は iOS のみ
    marginTop: Platform.OS === 'ios' ? (isTablet ? 4 : 2) : 0,
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
  lineSymbolTiny: {
    fontSize: 10,
    lineHeight: 10,
    transform: TINY_GLYPH_LIFT,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
    // Androidの上下ズレは GLYPH_LIFT が打ち消すので、視覚補正の marginTop は iOS のみ
    marginTop: Platform.OS === 'ios' ? 2 : 0,
  },
  stationNumber: {
    fontSize: NUMBER_SIZE,
    lineHeight: NUMBER_SIZE,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
    marginTop: isTablet ? -4 : -2,
  },
  longStationNumberAdditional: {
    fontSize: isTablet ? 20 * 1.5 : 20,
    letterSpacing: -2,
  },
});

const NumberingIconKeisei: React.FC<Props> = ({
  stationNumber: stationNumberRaw,
  lineColor,
  size,
  withOutline,
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = stationNumberRaw.split('-');
  const stationNumber = stationNumberRest.join('-');
  const isIncludesSubNumber = stationNumber.includes('-');
  // 記号と番号で同じ値を当てないと両者の間隔が変わるので、1つ選んで両方に渡す
  const glyphLift = isIncludesSubNumber
    ? glyphLiftStyles.longNumber
    : glyphLiftStyles.normal;
  const stationNumberTextStyles = useMemo(() => {
    if (isIncludesSubNumber) {
      return [
        styles.stationNumber,
        styles.longStationNumberAdditional,
        glyphLift,
      ];
    }
    return [styles.stationNumber, glyphLift];
  }, [isIncludesSubNumber, glyphLift]);

  if (size === NUMBERING_ICON_SIZE.SMALL) {
    return (
      <View style={[styles.rootTiny, { borderColor: lineColor }]}>
        <Typography style={[styles.lineSymbolTiny, { color: lineColor }]}>
          {lineSymbol}
        </Typography>
      </View>
    );
  }

  return (
    <View style={withOutline ? styles.optionalBorder : undefined}>
      <View style={[styles.root, { borderColor: lineColor }]}>
        <Typography
          style={[styles.lineSymbol, glyphLift, { color: lineColor }]}
        >
          {lineSymbol}
        </Typography>
        <Typography style={[stationNumberTextStyles, { color: lineColor }]}>
          {stationNumber}
        </Typography>
      </View>
    </View>
  );
};

export default React.memo(NumberingIconKeisei);
