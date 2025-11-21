import type React from 'react';
import { StyleSheet, View } from 'react-native';
import isTablet from '../utils/isTablet';
import Typography from './Typography';

type Props = {
  stationNumber: string;
  lineColor: string;
  withOutline?: boolean;
};

const styles = StyleSheet.create({
  optionalBorder: {
    borderRadius: (isTablet ? 64 * 1.5 : 64) / 2,
    borderWidth: 2,
    borderColor: '#fff',
  },
  root: {
    width: isTablet ? 64 * 1.5 : 64,
    height: isTablet ? 64 * 1.5 : 64,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderWidth: 4,
    borderRadius: (isTablet ? 64 * 1.5 : 64) / 2,
    overflow: 'hidden',
    backgroundColor: 'white',
  },
  lineSymbolContainer: {
    flex: 0.75,
    width: '100%',
  },
  lineSymbol: {
    color: 'white',
    fontSize: isTablet ? 22 * 1.5 : 22,
    lineHeight: isTablet ? 22 * 1.5 : 22,
    textAlign: 'center',
    fontWeight: 'bold',
    marginTop: 4,
  },
  stationNumber: {
    flex: 1,
    color: '#231f20',
    fontSize: isTablet ? 31 * 1.5 : 31,
    lineHeight: isTablet ? 31 * 1.5 : 31,
    textAlign: 'center',
    fontWeight: 'bold',
    marginTop: isTablet ? 4 : 0,
  },
});

const NumberingIconKeio: React.FC<Props> = ({
  stationNumber: stationNumberRaw,
  lineColor,
  withOutline,
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = stationNumberRaw.split('-');
  const stationNumber = stationNumberRest.join('');

  return (
    <View style={withOutline ? styles.optionalBorder : undefined}>
      <View style={[styles.root, { borderColor: lineColor }]}>
        <View
          style={[styles.lineSymbolContainer, { backgroundColor: lineColor }]}
        >
          <Typography style={styles.lineSymbol}>{lineSymbol}</Typography>
        </View>
        <Typography style={styles.stationNumber}>{stationNumber}</Typography>
      </View>
    </View>
  );
};

export default NumberingIconKeio;
