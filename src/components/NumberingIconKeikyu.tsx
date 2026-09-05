import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { FONTS } from '~/constants';
import isTablet from '~/utils/isTablet';
import { numberingStackedGlyphLift } from '~/utils/numberingGlyphLift';
import Typography from './Typography';

type Props = {
  stationNumber: string;
  lineColor: string;
  withOutline?: boolean;
};

const FONT = 'FuturaLTPro';
const SYMBOL_SIZE = isTablet ? 16 * 1.5 : 16;
const NUMBER_SIZE = isTablet ? 26 * 1.5 : 26;

// Androidのグリフ上寄り補正。記号と番号で同じ値を使わないと両者の間隔が変わる
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
    borderWidth: isTablet ? 8 * 1.5 : 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    backgroundColor: 'white',
  },
  lineSymbol: {
    color: '#00386D',
    fontSize: SYMBOL_SIZE,
    lineHeight: SYMBOL_SIZE,
    transform: GLYPH_LIFT,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
  },
  stationNumber: {
    color: '#00386D',
    fontSize: NUMBER_SIZE,
    lineHeight: NUMBER_SIZE,
    transform: GLYPH_LIFT,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
  },
  longStationNumberAdditional: {
    fontSize: isTablet ? 20 * 1.5 : 20,
    letterSpacing: -2,
  },
});

const NumberingIconKeikyu: React.FC<Props> = ({
  stationNumber: stationNumberRaw,
  lineColor,
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

  return (
    <View style={withOutline ? styles.optionalBorder : undefined}>
      <View style={[styles.root, { borderColor: lineColor }]}>
        <Typography style={styles.lineSymbol}>{lineSymbol}</Typography>
        <Typography style={stationNumberTextStyles}>{stationNumber}</Typography>
      </View>
    </View>
  );
};

export default React.memo(NumberingIconKeikyu);
