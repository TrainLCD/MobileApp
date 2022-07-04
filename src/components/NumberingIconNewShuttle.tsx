import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import FONTS from '../constants/fonts';
import isTablet from '../utils/isTablet';
import Hexagon from './Hexagon';

type Props = {
  stationNumber: string;
  lineColor: string;
};

const styles = StyleSheet.create({
  root: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderRadius: 8,
  },
  hexagonContainer: {
    position: 'absolute',
  },
  lineSymbol: {
    lineHeight: isTablet ? 27.5 * 1.5 : 27.5,
    fontSize: isTablet ? 27.5 * 1.5 : 27.5,
    textAlign: 'center',
    fontFamily: FONTS.MyriadPro,
    marginTop: 4,
    color: 'white',
  },
  stationNumber: {
    lineHeight: isTablet ? 27.5 * 1.5 : 27.5,
    fontSize: isTablet ? 27.5 * 1.5 : 27.5,
    marginTop: -4,
    textAlign: 'center',
    fontFamily: FONTS.MyriadPro,
    color: 'white',
  },
  content: {},
});

const NumberingIconNewShuttle: React.FC<Props> = ({
  stationNumber: stationNumberRaw,
  lineColor,
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = stationNumberRaw.split('-');
  const stationNumber = stationNumberRest.join('');
  const width = isTablet ? 72 * 1.5 : 72;
  const height = isTablet ? 72 * 1.5 : 72;

  return (
    <View style={[styles.root, { width, height }]}>
      <View style={styles.hexagonContainer}>
        <Hexagon width={width} height={height} fill={lineColor} />
      </View>
      <View style={styles.content}>
        <Text style={styles.lineSymbol}>{lineSymbol}</Text>
        <Text style={styles.stationNumber}>{stationNumber}</Text>
      </View>
    </View>
  );
};

export default NumberingIconNewShuttle;
