import type React from 'react';
import { StyleSheet, View } from 'react-native';
import isTablet from '../utils/isTablet';
import Typography from './Typography';

const styles = StyleSheet.create({
  optionalBorder: {
    borderRadius: '100%',
    borderWidth: 2,
    borderColor: '#fff',
  },
  root: {
    width: isTablet ? 72 * 1.5 : 72,
    height: isTablet ? 72 * 1.5 : 72,
    borderRadius: (isTablet ? 72 * 1.5 : 72) / 2,
    borderWidth: isTablet ? 6 * 1.5 : 6,
    borderColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    backgroundColor: 'white',
  },
  stationNumber: {
    color: 'black',
    fontSize: isTablet ? 35 * 1.5 : 35,
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

type Props = {
  stationNumber: string;
  withOutline?: boolean;
};

const NumberingIconMonochromeRound: React.FC<Props> = ({
  stationNumber,
  withOutline,
}) => {
  return (
    <View style={withOutline ? styles.optionalBorder : undefined}>
      <View style={styles.root}>
        <Typography style={styles.stationNumber}>{stationNumber}</Typography>
      </View>
    </View>
  );
};

export default NumberingIconMonochromeRound;
