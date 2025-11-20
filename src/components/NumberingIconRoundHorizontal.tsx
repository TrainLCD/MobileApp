import type React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  FONTS,
  NUMBERING_ICON_SIZE,
  type NumberingIconSize,
} from '../constants';
import isTablet from '../utils/isTablet';
import Typography from './Typography';

type Props = {
  stationNumber: string;
  lineColor: string;
  size?: NumberingIconSize;
  withOutline?: boolean;
};

const styles = StyleSheet.create({
  optionalBorder: {
    borderRadius: '100%',
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
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
  },
  lineSymbolLong: {
    color: '#221714',
    fontSize: isTablet ? 20 * 1.5 : 20,
    lineHeight: isTablet ? 20 * 1.5 : 20,
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
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
    marginTop: 1,
  },
  lineSymbolTinyLong: {
    color: '#221714',
    fontSize: 5,
    lineHeight: 5,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
    marginTop: 1,
  },
  lineSymbolMedium: {
    color: '#221714',
    fontSize: isTablet ? 24 : 14,
    lineHeight: isTablet ? 24 : 14,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
    marginTop: 2,
  },
  lineSymbolMediumLong: {
    color: '#221714',
    fontSize: isTablet ? 16 : 11,
    lineHeight: isTablet ? 16 : 11,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
    marginTop: 2,
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
