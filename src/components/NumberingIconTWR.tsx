import type React from 'react';
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

const SYMBOL_SIZE = isTablet ? 22 * 1.5 : 22;
const NUMBER_SIZE = isTablet ? 35 * 1.5 : 35;

// Androidのグリフ上寄り補正。記号と番号でフォントが違うので両方のメトリクスから求める。
// 記号と番号で異なる値を使うと両者の間隔まで変わるため同じ値を使い回す
const GLYPH_LIFT = numberingStackedGlyphLift(
  { fontSize: SYMBOL_SIZE, font: 'FuturaLTPro' },
  { fontSize: NUMBER_SIZE, font: 'MyriadPro' }
);

const styles = StyleSheet.create({
  optionalBorder: {
    borderRadius: (isTablet ? 72 * 1.5 : 72) / 2,
    borderWidth: 2,
    borderColor: '#fff',
  },
  root: {
    borderWidth: isTablet ? 8 : 4,
    borderColor: '#89c6cb',
    width: isTablet ? 72 * 1.5 : 72,
    height: isTablet ? 72 * 1.5 : 72,
    borderRadius: isTablet ? 72 * 1.5 : 72,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inner: {
    width: isTablet ? 58 * 1.5 : 58,
    height: isTablet ? 58 * 1.5 : 58,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderRadius: isTablet ? 58 * 1.5 : 58,
    borderWidth: 1,
    borderColor: 'white',
  },
  lineSymbol: {
    color: 'white',
    fontSize: SYMBOL_SIZE,
    lineHeight: SYMBOL_SIZE,
    transform: GLYPH_LIFT,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
  },
  stationNumber: {
    color: 'white',
    fontSize: NUMBER_SIZE,
    lineHeight: NUMBER_SIZE,
    transform: GLYPH_LIFT,
    marginTop: isTablet ? -4 * 1.2 : -4,
    textAlign: 'center',
    fontFamily: FONTS.MyriadPro,
  },
});

const NumberingIconTWR: React.FC<Props> = ({
  stationNumber: stationNumberRaw,
  lineColor,
  withOutline,
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = stationNumberRaw.split('-');
  const stationNumber = stationNumberRest.join('');

  return (
    <View style={withOutline ? styles.optionalBorder : undefined}>
      <View style={styles.root}>
        <View style={[styles.inner, { backgroundColor: lineColor }]}>
          <Typography style={styles.lineSymbol}>{lineSymbol}</Typography>
          <Typography style={styles.stationNumber}>{stationNumber}</Typography>
        </View>
      </View>
    </View>
  );
};

export default NumberingIconTWR;
