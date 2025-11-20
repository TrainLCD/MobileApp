import type React from 'react';
import { StyleSheet, View } from 'react-native';
import { NUMBERING_ICON_SIZE, type NumberingIconSize } from '../constants';
import isTablet from '../utils/isTablet';
import Typography from './Typography';

type Props = {
  withDarkTheme: boolean;
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
    borderWidth: isTablet ? 2 : 1,
    width: isTablet ? 72 * 1.5 : 72,
    height: isTablet ? 72 * 1.5 : 72,
    borderRadius: isTablet ? 72 * 1.5 : 72,
  },
  rootTiny: {
    width: 20,
    height: 20,
    borderRadius: 16.8,
    borderWidth: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rootTinySymbol: {
    fontSize: isTablet ? 4 * 1.5 : 4,
  },
  rootMedium: {
    width: isTablet ? 35 * 1.5 : 35,
    height: isTablet ? 35 * 1.5 : 35,
    borderRadius: isTablet ? 35 * 1.5 : 35,
    borderWidth: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediumLineSymbol: {
    fontSize: isTablet ? 12 * 1.5 : 12,
  },
  lineSymbol: {
    position: 'absolute',
    bottom: isTablet ? 15 : 10,
    alignSelf: 'center',
    fontSize: isTablet ? 18 * 1.5 : 18,
    lineHeight: isTablet ? 18 * 1.5 : 18,
    textAlign: 'center',
  },
  stationNumber: {
    position: 'absolute',
    top: isTablet ? 15 : 10,
    alignSelf: 'center',
    fontSize: isTablet ? 18 * 1.5 : 18,
    lineHeight: isTablet ? 18 * 1.5 : 18,
    textAlign: 'center',
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

const NumberingIconSMR: React.FC<Props> = ({
  stationNumber: stationNumberRaw,
  size,
  withDarkTheme,
  withOutline,
}: Props) => {
  const lineSymbol = stationNumberRaw.split('-')[0];
  const stationNumber = stationNumberRaw.split('-')[1];
  const preferColor = withDarkTheme ? 'white' : 'black';

  if (size === NUMBERING_ICON_SIZE.SMALL) {
    return (
      <View style={[styles.rootTiny, { borderColor: preferColor }]}>
        <Typography style={[styles.rootTinySymbol, { color: preferColor }]}>
          {lineSymbol}
        </Typography>
      </View>
    );
  }

  if (size === NUMBERING_ICON_SIZE.MEDIUM) {
    return (
      <View style={[styles.rootMedium, { borderColor: preferColor }]}>
        <Typography style={[styles.mediumLineSymbol, { color: preferColor }]}>
          {lineSymbol}
        </Typography>
      </View>
    );
  }

  return (
    <View style={withOutline ? styles.optionalBorder : undefined}>
      <View
        style={[
          styles.root,
          {
            borderColor: preferColor,
          },
        ]}
      >
        <Typography style={[styles.stationNumber, { color: preferColor }]}>
          {stationNumber}
        </Typography>
        <View style={[styles.divider, { backgroundColor: preferColor }]} />
        <Typography style={[styles.lineSymbol, { color: preferColor }]}>
          {lineSymbol}
        </Typography>
      </View>
    </View>
  );
};

export default NumberingIconSMR;
