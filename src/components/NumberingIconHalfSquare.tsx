import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import FONTS from '../constants/fonts';
import { CommonNumberingIconSize } from '../constants/numbering';
import isTablet from '../utils/isTablet';

type Props = {
  fullStationNumber: string;
  lineColor: string;
  size?: CommonNumberingIconSize;
  withRadius: boolean;
};

const styles = StyleSheet.create({
  root: {
    width: isTablet ? 64 * 1.5 : 64,
    height: isTablet ? 64 * 1.5 : 64,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderWidth: 1,
    borderColor: 'white',
  },
  lineSymbol: {
    color: 'white',
    fontSize: isTablet ? 22 * 1.5 : 22,
    lineHeight: isTablet ? 22 * 1.5 : 22,
    textAlign: 'center',
    fontFamily: FONTS.MyriadPro,
    marginTop: 4,
  },
  stationNumberContainer: {
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    width: isTablet ? 55 * 1.5 : 55,
    height: isTablet ? 34 * 1.5 : 34,
  },
  stationNumber: {
    color: '#231f20',
    fontSize: isTablet ? 37 * 1.5 : 37,
    lineHeight: isTablet ? 37 * 1.5 : 37,
    textAlign: 'center',
    fontFamily: FONTS.MyriadPro,
  },
});

const NumberingIconHalfSquare: React.FC<Props> = ({
  fullStationNumber,
  lineColor,
  size = 'normal',
  withRadius,
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = fullStationNumber.split('-');
  const stationNumber = stationNumberRest.join('');

  const borderRadius = useMemo(() => {
    if (!withRadius) {
      return 0;
    }

    return isTablet ? 8 * 1.5 : 8;
  }, [withRadius]);
  const stationNumberContainerBorderRadius = useMemo(() => {
    if (!withRadius) {
      return 0;
    }

    return isTablet ? 2 * 1.5 : 2;
  }, [withRadius]);

  return (
    <View style={[styles.root, { borderRadius, backgroundColor: lineColor }]}>
      <Text style={styles.lineSymbol}>{lineSymbol}</Text>
      <View
        style={[
          styles.stationNumberContainer,
          { borderRadius: stationNumberContainerBorderRadius },
        ]}
      >
        <Text style={styles.stationNumber}>{stationNumber}</Text>
      </View>
    </View>
  );
};

NumberingIconHalfSquare.defaultProps = {
  size: undefined,
};

export default NumberingIconHalfSquare;
