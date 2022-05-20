import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import FONTS from '../constants/fonts';
import isTablet from '../utils/isTablet';

type Props = {
  stationNumber: string;
  lineColor: string;
  small?: boolean;
};

const styles = StyleSheet.create({
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
    color: '#221714',
    fontSize: isTablet ? 22 * 1.5 : 22,
    lineHeight: isTablet ? 22 * 1.5 : 22,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
  },
  rootSmall: {
    width: isTablet ? 38 * 1.5 : 38,
    height: isTablet ? 38 * 1.5 : 38,
    borderRadius: (isTablet ? 72 * 1.5 : 72) / 2,
    borderWidth: isTablet ? 8 * 0.75 * 1.5 : 8 * 0.75,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    backgroundColor: 'white',
  },
  lineSymbolSmall: {
    color: '#221714',
    fontSize: isTablet ? 22 * 0.75 * 1.5 : 22 * 0.75,
    lineHeight: isTablet ? 22 * 0.75 * 1.5 : 22 * 0.75,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
    marginTop: isTablet ? 4 : 2,
  },
  stationNumber: {
    color: '#221714',
    fontSize: isTablet ? 26 * 1.5 : 26,
    lineHeight: isTablet ? 26 * 1.5 : 26,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
    marginTop: isTablet ? -4 : -2,
  },
  longStationNumberAdditional: {
    fontSize: isTablet ? 20 * 1.5 : 20,
    letterSpacing: -2,
  },
});

const NumberingIconRound: React.FC<Props> = ({
  stationNumber: stationNumberRaw,
  lineColor,
  small,
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

  if (small) {
    return (
      <View style={[styles.rootSmall, { borderColor: lineColor }]}>
        <Text style={styles.lineSymbolSmall}>{lineSymbol}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { borderColor: lineColor }]}>
      <Text style={styles.lineSymbol}>{lineSymbol}</Text>
      <Text style={stationNumberTextStyles}>{stationNumber}</Text>
    </View>
  );
};

NumberingIconRound.defaultProps = {
  small: false,
};

export default NumberingIconRound;
