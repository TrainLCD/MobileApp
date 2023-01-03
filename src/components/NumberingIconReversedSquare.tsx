import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import FONTS from '../constants/fonts';
import { NumberingIconSize, NUMBERING_ICON_SIZE } from '../constants/numbering';
import isTablet from '../utils/isTablet';

type Props = {
  stationNumber: string;
  lineColor: string;
  size?: NumberingIconSize;
  darkText?: boolean;
};

const styles = StyleSheet.create({
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
  rootSmall: {
    width: 38,
    height: 38,
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
  lineSymbolSmall: {
    fontSize: isTablet ? 14 * 1.5 : 14,
    lineHeight: isTablet ? 14 * 1.5 : 14,
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
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = stationNumberRaw.split('-');
  const stationNumber = stationNumberRest.join('');

  if (size === NUMBERING_ICON_SIZE.TINY) {
    return (
      <View style={[styles.rootTiny, { backgroundColor: lineColor }]}>
        <Text
          style={[
            styles.lineSymbolTiny,
            { color: darkText ? '#241f20' : 'white' },
          ]}
        >
          {lineSymbol}
        </Text>
      </View>
    );
  }

  if (size === NUMBERING_ICON_SIZE.SMALL) {
    return (
      <View style={[styles.rootSmall, { backgroundColor: lineColor }]}>
        <Text
          style={[
            styles.lineSymbolSmall,
            { color: darkText ? '#241f20' : 'white' },
          ]}
        >
          {lineSymbol}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: lineColor }]}>
      <Text
        style={[styles.lineSymbol, { color: darkText ? '#241f20' : 'white' }]}
      >
        {lineSymbol}
      </Text>
      <Text
        style={[
          styles.stationNumber,
          { color: darkText ? '#241f20' : 'white' },
        ]}
      >
        {stationNumber}
      </Text>
    </View>
  );
};

NumberingIconReversedSquare.defaultProps = {
  size: NUMBERING_ICON_SIZE.DEFAULT,
  darkText: false,
};

export default NumberingIconReversedSquare;
