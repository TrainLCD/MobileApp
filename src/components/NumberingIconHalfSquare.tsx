import React, { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import {
  FONTS,
  NUMBERING_ICON_SIZE,
  type NumberingIconSize,
} from '../constants';
import isTablet from '../utils/isTablet';
import { numberingGlyphLift } from '../utils/numberingGlyphLift';
import NumberingIconReversedSquare from './NumberingIconReversedSquare';
import Typography from './Typography';

type Props = {
  stationNumber: string;
  lineColor: string;
  withRadius: boolean;
  size?: NumberingIconSize;
  darkText: boolean;
  withOutline?: boolean;
};

const FONT = 'MyriadPro';
const SYMBOL_SIZE = isTablet ? 22 * 1.5 : 22;
const NUMBER_SIZE = isTablet ? 37 * 1.5 : 37;

// Androidのグリフ上寄り補正。番号は白地の箱の中で単独に中央寄せされるため、
// 記号と番号はそれぞれ1行として求める
const SYMBOL_GLYPH_LIFT = numberingGlyphLift(SYMBOL_SIZE, FONT);
const NUMBER_GLYPH_LIFT = numberingGlyphLift(NUMBER_SIZE, FONT);

const styles = StyleSheet.create({
  optionalBorder: {
    borderWidth: 2,
    borderColor: '#fff',
  },
  root: {
    width: isTablet ? 64 * 1.5 : 64,
    height: isTablet ? 64 * 1.5 : 64,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderWidth: 1,
    borderColor: 'white',
  },
  lineSymbol: {
    fontSize: SYMBOL_SIZE,
    lineHeight: SYMBOL_SIZE,
    transform: SYMBOL_GLYPH_LIFT,
    textAlign: 'center',
    fontFamily: FONTS.MyriadPro,
    // Androidの上下ズレは GLYPH_LIFT が打ち消すので、視覚補正の marginTop は iOS のみ
    marginTop: Platform.OS === 'ios' ? 4 : 0,
  },
  stationNumberContainer: {
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    width: isTablet ? 55 * 1.5 : 55,
    height: isTablet ? 34 * 1.5 : 34,
  },
  stationNumber: {
    color: '#231f20',
    fontSize: NUMBER_SIZE,
    lineHeight: NUMBER_SIZE,
    transform: NUMBER_GLYPH_LIFT,
    textAlign: 'center',
    fontFamily: FONTS.MyriadPro,
  },
});

const NumberingIconHalfSquare: React.FC<Props> = ({
  stationNumber: stationNumberRaw,
  lineColor,
  withRadius,
  size,
  darkText,
  withOutline,
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = stationNumberRaw.split('-');
  const stationNumber = stationNumberRest.join('');

  const borderRadius = useMemo(() => {
    if (!withRadius) {
      return 0;
    }

    return 8;
  }, [withRadius]);
  const stationNumberContainerBorderRadius = useMemo(() => {
    if (!withRadius) {
      return 0;
    }

    return 2;
  }, [withRadius]);

  if (size === NUMBERING_ICON_SIZE.SMALL) {
    return (
      <NumberingIconReversedSquare
        stationNumber={stationNumberRaw}
        lineColor={lineColor}
        size={NUMBERING_ICON_SIZE.SMALL}
      />
    );
  }

  if (size === NUMBERING_ICON_SIZE.MEDIUM) {
    return (
      <NumberingIconReversedSquare
        stationNumber={stationNumberRaw}
        lineColor={lineColor}
        size={NUMBERING_ICON_SIZE.MEDIUM}
      />
    );
  }

  return (
    <View
      style={
        withOutline ? [styles.optionalBorder, { borderRadius }] : undefined
      }
    >
      <View style={[styles.root, { borderRadius, backgroundColor: lineColor }]}>
        <Typography
          style={[styles.lineSymbol, { color: darkText ? '#231f20' : 'white' }]}
        >
          {lineSymbol}
        </Typography>
        <View
          style={[
            styles.stationNumberContainer,
            { borderRadius: stationNumberContainerBorderRadius },
          ]}
        >
          <Typography style={styles.stationNumber}>{stationNumber}</Typography>
        </View>
      </View>
    </View>
  );
};

export default React.memo(NumberingIconHalfSquare);
