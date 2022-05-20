import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import FONTS from '../constants/fonts';
import { NumberingIconSize } from '../constants/numbering';
import isTablet from '../utils/isTablet';

type Props = {
  stationNumber: string;
  lineColor: string;
  size?: NumberingIconSize;
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
    color: 'white',
    fontSize: isTablet ? 30 * 1.5 : 30,
    lineHeight: isTablet ? 30 * 1.5 : 30,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
    marginTop: 4,
  },
  stationNumber: {
    color: 'white',
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
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = stationNumberRaw.split('-');
  const stationNumber = stationNumberRest.join('');

  if (size === 'small') {
    return (
      <View style={[styles.rootSmall, { backgroundColor: lineColor }]}>
        <Text style={styles.lineSymbol}>{lineSymbol}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: lineColor }]}>
      <Text style={styles.lineSymbol}>{lineSymbol}</Text>
      <Text style={styles.stationNumber}>{stationNumber}</Text>
    </View>
  );
};

NumberingIconReversedSquareWest.defaultProps = {
  size: 'default',
};

export default NumberingIconReversedSquareWest;
