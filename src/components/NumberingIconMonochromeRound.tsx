import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { NUMBERING_ICON_SIZE, type NumberingIconSize } from '~/constants';
import isTablet from '../utils/isTablet';
import Typography from './Typography';

const styles = StyleSheet.create({
  optionalBorder: {
    borderRadius: (isTablet ? 72 * 1.5 : 72) / 2,
    borderWidth: 2,
  },
  smallRoot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: 'black',
  },
  mediumRoot: {
    width: isTablet ? 35 * 1.5 : 35,
    height: isTablet ? 35 * 1.5 : 35,
    borderRadius: (isTablet ? 35 * 1.5 : 35) / 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: isTablet ? 6 * 1.5 : 6,
    borderColor: 'black',
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
  smallStationNumber: {
    color: 'black',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  mediumStationNumber: {
    color: 'black',
    fontSize: 18,
    textAlign: 'center',
    fontWeight: 'bold',
    letterSpacing: -1,
  },
  stationNumber: {
    color: 'black',
    fontSize: isTablet ? 24 * 1.5 : 24,
    textAlign: 'center',
    fontWeight: 'bold',
    letterSpacing: -1,
  },
  numOnlyStationNumber: {
    color: 'black',
    fontSize: isTablet ? 35 * 1.5 : 35,
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

type Props = {
  stationNumber: string;
  withOutline?: boolean;
  size?: NumberingIconSize;
};

const NumberingIconMonochromeRound: React.FC<Props> = ({
  stationNumber,
  withOutline,
  size,
}) => {
  const rootStyle = useMemo(() => {
    if (size === NUMBERING_ICON_SIZE.SMALL) {
      return styles.smallRoot;
    }
    if (size === NUMBERING_ICON_SIZE.MEDIUM) {
      return styles.mediumRoot;
    }
    return styles.root;
  }, [size]);

  const typographyStyle = useMemo(() => {
    if (size === NUMBERING_ICON_SIZE.SMALL) {
      return styles.smallStationNumber;
    }
    if (size === NUMBERING_ICON_SIZE.MEDIUM) {
      return styles.mediumStationNumber;
    }

    const numOnly = !stationNumber.includes('-');
    if (numOnly) {
      return styles.numOnlyStationNumber;
    }

    return styles.stationNumber;
  }, [size, stationNumber]);

  const text = useMemo(() => {
    const [lineSymbol] = stationNumber.split('-');
    const replacedStationNumber = stationNumber.replaceAll('-', '');

    return size === NUMBERING_ICON_SIZE.SMALL
      ? lineSymbol
      : replacedStationNumber;
  }, [stationNumber, size]);

  return (
    <View style={withOutline ? styles.optionalBorder : undefined}>
      <View style={rootStyle}>
        <Typography style={typographyStyle}>{text}</Typography>
      </View>
    </View>
  );
};

export default React.memo(NumberingIconMonochromeRound);
