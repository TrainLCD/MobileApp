import type React from 'react';
import { StyleSheet, View } from 'react-native';
import { FONTS } from '../constants';
import isTablet from '../utils/isTablet';
import Hexagon from './Hexagon';
import Typography from './Typography';

type Props = {
  stationNumber: string;
  lineColor: string;
  withOutline?: boolean;
};

const styles = StyleSheet.create({
  optionalBorder: {
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 8,
  },
  root: {
    width: isTablet ? 72 * 1.5 : 72,
    height: isTablet ? 72 * 1.5 : 72,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
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
  withOutline,
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = stationNumberRaw.split('-');
  const stationNumber = stationNumberRest.join('');
  const width = isTablet ? 72 * 1.5 : 72;
  const height = isTablet ? 72 * 1.5 : 72;

  return (
    <View style={withOutline ? styles.optionalBorder : undefined}>
      <View style={styles.root}>
        <View style={styles.hexagonContainer}>
          <Hexagon width={width} height={height} fill={lineColor} />
        </View>
        <View style={styles.content}>
          <Typography style={styles.lineSymbol}>{lineSymbol}</Typography>
          <Typography style={styles.stationNumber}>{stationNumber}</Typography>
        </View>
      </View>
    </View>
  );
};

export default NumberingIconNewShuttle;
