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
  stationNumber: {
    color: 'white',
    fontSize: isTablet ? 35 * 1.5 : 35,
    lineHeight: isTablet ? 35 * 1.5 : 35,
    marginTop: isTablet ? 6 * 1.2 : 6,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
  },
});

const NumberingIconNumberOnly: React.FC<Props> = ({
  stationNumber: stationNumberRaw,
  lineColor,
  size,
}: Props) => {
  const stationNumber = stationNumberRaw.split('-')[1];

  if (size === NUMBERING_ICON_SIZE.TINY) {
    return (
      <View style={[styles.rootTiny, { borderColor: lineColor }]}>
        <View style={[styles.tinyInner, { backgroundColor: lineColor }]} />
      </View>
    );
  }

  if (size === NUMBERING_ICON_SIZE.SMALL) {
    return (
      <View style={[styles.rootSmall, { borderColor: lineColor }]}>
        <View style={[styles.smallInner, { backgroundColor: lineColor }]} />
      </View>
    );
  }
  return (
    <View style={[styles.root, { borderColor: lineColor }]}>
      <View style={[styles.inner, { backgroundColor: lineColor }]}>
        <Text style={styles.stationNumber}>{stationNumber}</Text>
      </View>
    </View>
  );
};

NumberingIconNumberOnly.defaultProps = {
  size: NUMBERING_ICON_SIZE.DEFAULT,
};

export default NumberingIconNumberOnly;
