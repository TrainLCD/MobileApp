import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import FONTS from '../constants/fonts';
import { NumberingIconSize, NUMBERING_ICON_SIZE } from '../constants/numbering';
import isTablet from '../utils/isTablet';

type Props = {
  stationNumber: string;
  lineColor: string;
  size?: NumberingIconSize;
};

const styles = StyleSheet.create({
  root: {
    borderWidth: isTablet ? 4 : 2,
    width: isTablet ? 72 * 1.5 : 72,
    height: isTablet ? 72 * 1.5 : 72,
    borderRadius: isTablet ? 72 * 1.5 : 72,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inner: {
    width: isTablet ? 66 * 1.5 : 66,
    height: isTablet ? 66 * 1.5 : 66,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderRadius: isTablet ? 70 * 1.5 : 70,
    borderWidth: 1,
    borderColor: 'white',
  },
  lineSymbol: {
    color: 'white',
    fontSize: isTablet ? 20 * 1.5 : 20,
    lineHeight: isTablet ? 20 * 1.5 : 20,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
    marginTop: isTablet ? 4 * 1.2 : 4,
  },
  rootTiny: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16.8,
    borderWidth: 1,
  },
  tinyInner: {
    width: 21.6,
    height: 21.6,
    borderRadius: 21.6 / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rootSmall: {
    width: isTablet ? 38 * 1.5 : 38,
    height: isTablet ? 38 * 1.5 : 38,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderRadius: isTablet ? 38 * 1.5 : 38,
    borderWidth: isTablet ? 2 : 1,
    borderColor: 'white',
  },
  smallInner: {
    width: isTablet ? 33 * 1.5 : 33,
    height: isTablet ? 33 * 1.5 : 33,
    borderRadius: (isTablet ? 33 * 1.5 : 33) / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lineSymbolTiny: {
    color: 'white',
    fontSize: 10,
    lineHeight: 10,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
    marginTop: 2,
  },
  lineSymbolSmall: {
    color: 'white',
    fontSize: isTablet ? 18 * 1.5 : 18,
    lineHeight: isTablet ? 18 * 1.5 : 18,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
    marginTop: isTablet ? 6 : 4,
  },
  stationNumber: {
    color: 'white',
    fontSize: isTablet ? 35 * 1.5 : 35,
    lineHeight: isTablet ? 35 * 1.5 : 35,
    marginTop: isTablet ? -2 * 1.2 : -2,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
  },
});

const NumberingIconSanyo: React.FC<Props> = ({
  stationNumber: stationNumberRaw,
  lineColor,
  size,
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = stationNumberRaw.split('-');
  const stationNumber = stationNumberRest.join('');

  if (size === NUMBERING_ICON_SIZE.TINY) {
    return (
      <View style={[styles.rootTiny, { borderColor: lineColor }]}>
        <View style={[styles.tinyInner, { backgroundColor: lineColor }]}>
          <Text style={styles.lineSymbolTiny}>{lineSymbol}</Text>
        </View>
      </View>
    );
  }

  if (size === NUMBERING_ICON_SIZE.SMALL) {
    return (
      <View style={[styles.rootSmall, { borderColor: lineColor }]}>
        <View style={[styles.smallInner, { backgroundColor: lineColor }]}>
          <Text style={styles.lineSymbolSmall}>{lineSymbol}</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={[styles.root, { borderColor: lineColor }]}>
      <View style={[styles.inner, { backgroundColor: lineColor }]}>
        <Text style={styles.lineSymbol}>{lineSymbol}</Text>
        <Text style={styles.stationNumber}>{stationNumber}</Text>
      </View>
    </View>
  );
};

NumberingIconSanyo.defaultProps = {
  size: NUMBERING_ICON_SIZE.DEFAULT,
};

export default NumberingIconSanyo;
