import type React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { FONTS } from '../constants';
import isTablet from '../utils/isTablet';
import { numberingGlyphLift } from '../utils/numberingGlyphLift';
import Typography from './Typography';

type Props = {
  stationNumber: string;
  lineColor: string;

  darkText?: boolean;
  withOutline?: boolean;
};

// Androidのグリフ下寄り補正。記号と番号で同じ値を使わないと両者の間隔が変わる
const GLYPH_LIFT = numberingGlyphLift(isTablet ? 30 * 1.5 : 30);

const styles = StyleSheet.create({
  optionalBorder: {
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 4,
  },
  root: {
    width: isTablet ? 64 * 1.5 : 64,
    height: isTablet ? 64 * 1.5 : 64,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
  },
  lineSymbol: {
    fontSize: isTablet ? 30 * 1.5 : 30,
    lineHeight: isTablet ? 30 * 1.5 : 30,
    transform: GLYPH_LIFT,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
    marginTop: Platform.OS === 'ios' ? 4 : 0,
  },
  stationNumber: {
    marginTop: -4,
    fontSize: isTablet ? 30 * 1.5 : 30,
    lineHeight: isTablet ? 30 * 1.5 : 30,
    transform: GLYPH_LIFT,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
  },
});

const NumberingIconReversedSquareWest: React.FC<Props> = ({
  stationNumber: stationNumberRaw,
  lineColor,
  darkText,
  withOutline,
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = stationNumberRaw.split('-');
  const stationNumber = stationNumberRest.join('');

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

export default NumberingIconReversedSquareWest;
