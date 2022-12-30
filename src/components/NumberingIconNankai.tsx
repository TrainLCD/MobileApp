import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Ellipse } from 'react-native-svg';
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
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  texts: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lineSymbol: {
    color: 'white',
    fontSize: isTablet ? 18 * 1.5 : 18,
    lineHeight: isTablet ? 18 * 1.5 : 18,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
    marginTop: isTablet ? 8 : 4,
  },
  rootTiny: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderRadius: 16.8,
    borderWidth: 1,
    borderColor: 'white',
  },
  rootSmall: {
    width: isTablet ? 38 * 1.5 : 38,
    height: isTablet ? 38 * 1.5 : 38,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderRadius: isTablet ? 38 * 1.5 : 38,
    borderWidth: 1,
    borderColor: 'white',
  },
  lineSymbolTiny: {
    color: 'white',
    fontSize: 10,
    lineHeight: 10,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
    marginTop: 2,
  },
  lineSymbolSmall: {
    color: 'white',
    fontSize: isTablet ? 21 * 1.5 : 21,
    lineHeight: isTablet ? 21 * 1.5 : 21,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
    marginTop: isTablet ? 4 : 2,
  },
  stationNumber: {
    color: 'white',
    fontSize: isTablet ? 32 * 1.5 : 32,
    lineHeight: isTablet ? 32 * 1.5 : 32,
    marginTop: isTablet ? -4 * 1.2 : -4,
    textAlign: 'center',
    fontFamily: FONTS.MyriadPro,
  },
});

const NumberingIconNankai: React.FC<Props> = ({
  stationNumber: stationNumberRaw,
  lineColor,
  size,
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = stationNumberRaw.split('-');
  const stationNumber = stationNumberRest.join('-');

  if (size === NUMBERING_ICON_SIZE.TINY) {
    return (
      <View style={[styles.rootTiny, { backgroundColor: lineColor }]}>
        <Text style={styles.lineSymbolTiny}>{lineSymbol}</Text>
      </View>
    );
  }

  if (size === NUMBERING_ICON_SIZE.SMALL) {
    return (
      <View style={[styles.rootSmall, { backgroundColor: lineColor }]}>
        <Text style={styles.lineSymbolSmall}>{lineSymbol}</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Svg height={isTablet ? 72 * 1.5 : 72} width={isTablet ? 72 * 1.5 : 72}>
        <Ellipse
          cx={(isTablet ? 72 * 1.5 : 72) / 2}
          cy={(isTablet ? 72 * 1.5 : 72) / 2}
          rx={(isTablet ? 72 * 1.5 : 72) / 2}
          ry={(isTablet ? 72 * 1.5 : 72) / 2.5}
          stroke="white"
          strokeWidth={1}
          fill={lineColor}
        />
      </Svg>
      <View style={styles.texts}>
        <Text style={styles.lineSymbol}>{lineSymbol}</Text>
        <Text style={styles.stationNumber}>{stationNumber}</Text>
      </View>
    </View>
  );
};

NumberingIconNankai.defaultProps = {
  size: NUMBERING_ICON_SIZE.DEFAULT,
};

export default NumberingIconNankai;
