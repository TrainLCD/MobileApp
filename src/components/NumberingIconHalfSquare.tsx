import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  FONTS,
  NUMBERING_ICON_SIZE,
  type NumberingIconSize,
} from '../constants';
import isTablet from '../utils/isTablet';
import NumberingIconReversedSquare from './NumberingIconReversedSquare';
import Typography from './Typography';

type Props = {
  stationNumber: string;
  lineColor: string;
  withRadius: boolean;
  size?: NumberingIconSize;
  darkText: boolean;
  withOutline?: boolean;
};

const styles = StyleSheet.create({
  optionalBorder: {
    borderWidth: 2,
    borderColor: '#fff',
  },
  root: {
    width: isTablet ? 64 * 1.5 : 64,
    height: isTablet ? 64 * 1.5 : 64,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderWidth: 1,
    borderColor: 'white',
  },
  rootMediumContainer: {
    width: 38 * 1.5,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderWidth: 1,
    borderColor: 'white',
  },
  lineSymbol: {
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
  stationNumber: stationNumberRaw,
  lineColor,
  withRadius,
  size,
  darkText,
  withOutline,
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = stationNumberRaw.split('-');
  const stationNumber = stationNumberRest.join('');

  const borderRadius = useMemo(() => {
    if (!withRadius) {
      return 0;
    }

    return 8;
  }, [withRadius]);
  const stationNumberContainerBorderRadius = useMemo(() => {
    if (!withRadius) {
      return 0;
    }

    return 2;
  }, [withRadius]);

  if (size === NUMBERING_ICON_SIZE.SMALL) {
    return (
      <NumberingIconReversedSquare
        stationNumber={stationNumberRaw}
        lineColor={lineColor}
        size={NUMBERING_ICON_SIZE.SMALL}
      />
    );
  }

  if (size === NUMBERING_ICON_SIZE.MEDIUM) {
    return (
      <NumberingIconReversedSquare
        stationNumber={stationNumberRaw}
        lineColor={lineColor}
        size={NUMBERING_ICON_SIZE.MEDIUM}
      />
    );
  }

  return (
    <View
      style={
        withOutline ? [styles.optionalBorder, { borderRadius }] : undefined
      }
    >
      <View style={[styles.root, { borderRadius, backgroundColor: lineColor }]}>
        <Typography
          style={[styles.lineSymbol, { color: darkText ? '#231f20' : 'white' }]}
        >
          {lineSymbol}
        </Typography>
        <View
          style={[
            styles.stationNumberContainer,
            { borderRadius: stationNumberContainerBorderRadius },
          ]}
        >
          <Typography style={styles.stationNumber}>{stationNumber}</Typography>
        </View>
      </View>
    </View>
  );
};

export default React.memo(NumberingIconHalfSquare);
