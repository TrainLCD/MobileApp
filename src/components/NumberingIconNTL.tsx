import type React from 'react';
import { StyleSheet, View } from 'react-native';
import { FONTS } from '../constants';
import isTablet from '../utils/isTablet';
import Typography from './Typography';

type Props = {
  stationNumber: string;
  withOutline?: boolean;
};

const styles = StyleSheet.create({
  optionalBorder: {
    borderRadius: isTablet ? 14 : 10,
    borderWidth: 2,
    borderColor: '#fff',
  },
  root: {
    width: isTablet ? 72 * 1.5 : 72,
    height: isTablet ? 72 * 1.5 : 72,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderRadius: isTablet ? 12 : 8,
    borderWidth: isTablet ? 7 * 1.5 : 7,
    backgroundColor: 'white',
    borderColor: '#d53a77',
  },
  inner: {
    borderColor: '#69b444',
    borderWidth: (isTablet ? 7 * 1.5 : 7) * 0.5,
    width: isTablet ? 51 * 1.5 : 51,
    height: isTablet ? 51 * 1.5 : 51,
    borderRadius: isTablet ? 6 : 4,
  },
  lineSymbol: {
    lineHeight: isTablet ? 18 * 1.5 : 18,
    fontSize: isTablet ? 18 * 1.5 : 18,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
    marginTop: 4,
  },
  stationNumber: {
    lineHeight: isTablet ? 28 * 1.5 : 28,
    fontSize: isTablet ? 28 * 1.5 : 28,
    marginTop: -4,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
  },
});

const NumberingIconNTL: React.FC<Props> = ({
  stationNumber: stationNumberRaw,
  withOutline,
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = stationNumberRaw.split('-');
  const stationNumber = stationNumberRest.join('');

  return (
    <View style={withOutline ? styles.optionalBorder : undefined}>
      <View style={styles.root}>
        <View style={styles.inner}>
          <Typography style={styles.lineSymbol}>{lineSymbol}</Typography>
          <Typography style={styles.stationNumber}>{stationNumber}</Typography>
        </View>
      </View>
    </View>
  );
};

export default NumberingIconNTL;
