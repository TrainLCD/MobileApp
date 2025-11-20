import type React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  FONTS,
  NUMBERING_ICON_SIZE,
  type NumberingIconSize,
} from '../constants';
import isTablet from '../utils/isTablet';
import Typography from './Typography';

type Props = {
  lineColor: string;
  stationNumber: string;
  size?: NumberingIconSize;
  withOutline?: boolean;
};

const styles = StyleSheet.create({
  optionalBorder: {
    borderRadius: '100%',
    borderWidth: 2,
    borderColor: '#fff',
  },
  root: {
    borderWidth: isTablet ? 3 : 2,
    width: isTablet ? 72 * 1.5 : 72,
    height: isTablet ? 72 * 1.5 : 72,
    borderRadius: isTablet ? 72 * 1.5 : 72,
    overflow: 'hidden',
    backgroundColor: 'white',
  },
  rootTiny: {
    width: 20,
    height: 20,
    borderRadius: 16.8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rootTinySymbol: {
    color: 'white',
    fontSize: isTablet ? 8 * 1.5 : 8,
    fontFamily: FONTS.RobotoBold,
  },
  rootMedium: {
    width: isTablet ? 35 * 1.5 : 35,
    height: isTablet ? 35 * 1.5 : 35,
    borderRadius: isTablet ? 35 * 1.5 : 35,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediumLineSymbol: {
    fontSize: isTablet ? 16 * 1.5 : 16,
    fontFamily: FONTS.RobotoBold,
    color: 'white',
  },
  stationNumberBg: {
    position: 'absolute',
    width: '100%',
    height: isTablet ? 36 * 1.5 : 36,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stationNumber: {
    fontSize: isTablet ? 30 * 1.5 : 30,
    fontFamily: FONTS.RobotoBold,
    textAlign: 'center',
    color: 'white',
  },
  lineSymbolContainer: {
    width: '100%',
    height: isTablet ? 36 * 1.5 : 36,
    top: 0,
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lineSymbol: {
    fontSize: isTablet ? 30 * 1.5 : 30,
    textAlign: 'center',
    fontFamily: FONTS.RobotoBold,
  },
  divider: {
    top: isTablet ? (72 * 1.5) / 2 - 6 : 72 / 2 - 2,
    position: 'absolute',
    height: isTablet ? 2 : 1,
    left: isTablet ? -2 : -1,
    width: isTablet ? 72 * 1.5 : 72,
    backgroundColor: 'black',
  },
});

const NumberingIconIzuhakone: React.FC<Props> = ({
  stationNumber: stationNumberRaw,
  size,
  lineColor,
  withOutline,
}: Props) => {
  const lineSymbol = stationNumberRaw.split('-')[0];
  const stationNumber = stationNumberRaw.split('-')[1];

  if (size === NUMBERING_ICON_SIZE.SMALL) {
    return (
      <View style={[styles.rootTiny, { backgroundColor: lineColor }]}>
        <Typography style={styles.rootTinySymbol}>{lineSymbol}</Typography>
      </View>
    );
  }

  if (size === NUMBERING_ICON_SIZE.MEDIUM) {
    return (
      <View style={[styles.rootMedium, { backgroundColor: lineColor }]}>
        <Typography style={styles.mediumLineSymbol}>{lineSymbol}</Typography>
      </View>
    );
  }

  return (
    <View style={withOutline ? styles.optionalBorder : undefined}>
      <View
        style={[
          styles.root,
          {
            borderColor: lineColor,
          },
        ]}
      >
        <View style={styles.lineSymbolContainer}>
          <Typography style={[styles.lineSymbol, { color: lineColor }]}>
            {lineSymbol}
          </Typography>
        </View>
        <View style={[styles.divider, { backgroundColor: lineColor }]} />
        <View style={[styles.stationNumberBg, { backgroundColor: lineColor }]}>
          <Typography style={styles.stationNumber}>{stationNumber}</Typography>
        </View>
      </View>
    </View>
  );
};

export default NumberingIconIzuhakone;
