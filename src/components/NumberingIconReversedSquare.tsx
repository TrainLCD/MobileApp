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
  darkText?: boolean;
  withOutline?: boolean;
};

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
    fontSize: isTablet ? 22 * 1.5 : 22,
    lineHeight: isTablet ? 22 * 1.5 : 22,
    textAlign: 'center',
    fontFamily: FONTS.MyriadPro,
    marginTop: 4,
  },
  lineSymbolMedium: {
    fontSize: isTablet ? 18 * 1.5 : 18,
    lineHeight: isTablet ? 18 * 1.5 : 18,
    textAlign: 'center',
    fontFamily: FONTS.MyriadPro,
    marginTop: 2,
  },
  lineSymbolTiny: {
    fontSize: 10,
    lineHeight: 10,
    textAlign: 'center',
    fontFamily: FONTS.MyriadPro,
    marginTop: 2,
  },
  stationNumber: {
    fontSize: isTablet ? 37 * 1.5 : 35,
    lineHeight: isTablet ? 37 * 1.5 : 35,
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
