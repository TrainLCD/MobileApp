import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { FONTS } from '~/constants';
import isTablet from '~/utils/isTablet';
import Typography from './Typography';

type Props = {
  stationNumber: string;
  lineColor: string;
  withOutline?: boolean;
};

const styles = StyleSheet.create({
  optionalBorder: {
    borderRadius: (isTablet ? 72 * 1.5 : 72) / 2,
    borderWidth: 2,
    borderColor: '#fff',
  },
  root: {
    width: isTablet ? 72 * 1.5 : 72,
    height: isTablet ? 72 * 1.5 : 72,
    borderRadius: (isTablet ? 72 * 1.5 : 72) / 2,
    borderWidth: isTablet ? 8 * 1.5 : 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    backgroundColor: 'white',
  },
  lineSymbol: {
    color: '#00386D',
    fontSize: isTablet ? 16 * 1.5 : 16,
    lineHeight: isTablet ? 16 * 1.5 : 16,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
  },
  stationNumber: {
    color: '#00386D',
    fontSize: isTablet ? 26 * 1.5 : 26,
    lineHeight: isTablet ? 26 * 1.5 : 26,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
  },
  longStationNumberAdditional: {
    fontSize: isTablet ? 20 * 1.5 : 20,
    letterSpacing: -2,
  },
});

const NumberingIconKeikyu: React.FC<Props> = ({
  stationNumber: stationNumberRaw,
  lineColor,
  withOutline,
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = stationNumberRaw.split('-');
  const stationNumber = stationNumberRest.join('-');
  const isIncludesSubNumber = stationNumber.includes('-');
  const stationNumberTextStyles = useMemo(() => {
    if (isIncludesSubNumber) {
      return [styles.stationNumber, styles.longStationNumberAdditional];
    }
    return styles.stationNumber;
  }, [isIncludesSubNumber]);

  return (
    <View style={withOutline ? styles.optionalBorder : undefined}>
      <View style={[styles.root, { borderColor: lineColor }]}>
        <Typography style={styles.lineSymbol}>{lineSymbol}</Typography>
        <Typography style={stationNumberTextStyles}>{stationNumber}</Typography>
      </View>
    </View>
  );
};

export default React.memo(NumberingIconKeikyu);
