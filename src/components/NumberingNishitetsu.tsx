import React from 'react';
import { StyleSheet, View } from 'react-native';
import isTablet from '~/utils/isTablet';
import {
  FONTS,
  NUMBERING_ICON_SIZE,
  type NumberingIconSize,
} from '../constants';
import NumberingIconReversedSquare from './NumberingIconReversedSquare';
import Typography from './Typography';

type Props = {
  stationNumber: string;
  lineColor: string;
  size?: NumberingIconSize;
  withOutline?: boolean;
};

const styles = StyleSheet.create({
  optionalBorder: {
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  root: {
    width: isTablet ? 84 * 1.5 : 84,
    height: isTablet ? 55 * 1.5 : 55,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'white',
    padding: 4,
    borderRadius: 4,
    gap: 4,
  },
  rootMediumContainer: {
    width: 38 * 1.5,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'white',
  },
  lineSymbol: {
    width: '35%',
    fontSize: isTablet ? 18 * 1.5 : 18,
    textAlign: 'center',
    fontFamily: FONTS.RobotoBold,
  },
  stationNumberContainer: {
    flex: 1,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  stationNumber: {
    color: '#231f20',
    fontSize: isTablet ? 28 * 1.5 : 28,
    textAlign: 'center',
    fontFamily: FONTS.RobotoBold,
  },
});

const NumberingIconNishitetsu: React.FC<Props> = ({
  stationNumber: stationNumberRaw,
  lineColor,
  size,
  withOutline,
}: Props) => {
  const darkText = false;
  const [lineSymbol, ...stationNumberRest] = stationNumberRaw.split('-');
  const stationNumber = stationNumberRest.join('');

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
    <View style={withOutline ? styles.optionalBorder : undefined}>
      <View style={[styles.root, { backgroundColor: lineColor }]}>
        <Typography
          style={[styles.lineSymbol, { color: darkText ? '#231f20' : 'white' }]}
        >
          {lineSymbol}
        </Typography>
        <View style={styles.stationNumberContainer}>
          <Typography style={styles.stationNumber}>{stationNumber}</Typography>
        </View>
      </View>
    </View>
  );
};

export default React.memo(NumberingIconNishitetsu);
