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
    borderColor: 'white',
  },
  rootSmall: {
    width: isTablet ? 38 * 1.5 : 38,
    height: isTablet ? 38 * 1.5 : 38,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderColor: 'white',
  },
  lineSymbol: {
    fontSize: isTablet ? 30 * 1.5 : 30,
    lineHeight: isTablet ? 30 * 1.5 : 30,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
    marginTop: 4,
  },
  stationNumber: {
    marginTop: -4,
    fontSize: isTablet ? 30 * 1.5 : 30,
    lineHeight: isTablet ? 30 * 1.5 : 30,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
  },
});

const NumberingIconReversedSquareWest: React.FC<Props> = ({
  stationNumber: stationNumberRaw,
  lineColor,
  size,
  darkText,
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = stationNumberRaw.split('-');
  const stationNumber = stationNumberRest.join('');

  if (size === NUMBERING_ICON_SIZE.SMALL) {
    return (
      <View style={[styles.rootSmall, { backgroundColor: lineColor }]}>
        <Text
          style={[styles.lineSymbol, { color: darkText ? '#241f20' : 'white' }]}
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

NumberingIconReversedSquareWest.defaultProps = {
  size: NUMBERING_ICON_SIZE.DEFAULT,
  darkText: false,
};

export default NumberingIconReversedSquareWest;
