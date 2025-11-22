import type React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import {
  FONTS,
  NUMBERING_ICON_SIZE,
  type NumberingIconSize,
} from '../constants';
import isTablet from '../utils/isTablet';
import Typography from './Typography';

type Props = {
  stationNumber: string;
  lineColor: string;
  threeLetterCode?: string | null;
  allowScaling: boolean;
  size?: NumberingIconSize;
  transformOrigin?: 'top' | 'center' | 'bottom';
  withOutline?: boolean;
};

const styles = StyleSheet.create({
  optionalBorder: {
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  root: {
    width: isTablet ? 72 * 1.5 : 72,
    height: isTablet ? 72 * 1.5 : 72,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderRadius: isTablet ? 12 : 8,
    borderWidth: isTablet ? 7 * 1.5 : 7,
    backgroundColor: 'white',
  },
  tlcRoot: {
    transform: [{ scale: 0.7 }],
    maxWidth: isTablet ? 82 * 1.5 : 82,
    flex: 1,
    justifyContent: 'center',
  },
  tlcContainer: {
    backgroundColor: '#231e1f',
    borderWidth: 1,
    borderColor: 'white',
    borderRadius: isTablet ? 16 : 14,
    paddingVertical: isTablet ? 8 : 4,
    paddingHorizontal: isTablet ? 8 : 4,
  },
  tlcText: {
    color: 'white',
    textAlign: 'center',
    fontSize: isTablet ? 24 * 1.5 : 24,
    fontFamily: FONTS.FrutigerNeueLTProBold,
    includeFontPadding: false,
    lineHeight: isTablet ? 24 * 1.5 : 24,
  },
  rootSmall: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderRadius: 4,
    borderWidth: 3,
    borderColor: 'white',
  },
  lineSymbolSmall: {
    fontSize: 10,
    lineHeight: 10,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
    marginTop: 2,
    color: '#231e1f',
  },
  lineSymbol: {
    lineHeight: isTablet ? 24 * 1.5 : 24,
    fontSize: isTablet ? 24 * 1.5 : 24,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
    marginTop: Platform.OS === 'ios' ? 4 : 0,
  },
  stationNumber: {
    lineHeight: isTablet ? 32 * 1.5 : 32,
    fontSize: isTablet ? 32 * 1.5 : 32,
    marginTop: -4,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
  },
});

type CommonCompProps = {
  lineColor: string;
  threeLetterCode: string | undefined | null;
  lineSymbol: string;
  stationNumber: string;
  size?: NumberingIconSize;
  withOutline?: boolean;
};

const Common = ({
  lineColor,
  lineSymbol,
  stationNumber,
  size,
  withOutline,
}: CommonCompProps) => {
  if (size === NUMBERING_ICON_SIZE.SMALL) {
    return (
      <View style={[styles.rootSmall, { borderColor: lineColor }]}>
        <Typography style={styles.lineSymbolSmall}>{lineSymbol}</Typography>
      </View>
    );
  }
  return (
    <View style={withOutline ? styles.optionalBorder : undefined}>
      <View style={[styles.root, { borderColor: lineColor }]}>
        <Typography style={styles.lineSymbol}>{lineSymbol}</Typography>
        <Typography style={styles.stationNumber}>{stationNumber}</Typography>
      </View>
    </View>
  );
};

const NumberingIconSquare: React.FC<Props> = ({
  stationNumber: stationNumberRaw,
  lineColor,
  threeLetterCode,
  allowScaling,
  size,
  transformOrigin = 'center',
  withOutline,
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = stationNumberRaw.split('-');
  const stationNumber = stationNumberRest.join('');

  if (threeLetterCode) {
    return (
      <View
        style={[
          styles.tlcRoot,
          {
            transformOrigin: transformOrigin,
          },
        ]}
      >
        <View style={styles.tlcContainer}>
          <Typography style={styles.tlcText}>{threeLetterCode}</Typography>
          <Common
            lineColor={lineColor}
            threeLetterCode={threeLetterCode}
            lineSymbol={lineSymbol}
            stationNumber={stationNumber}
          />
        </View>
      </View>
    );
  }

  if (size === NUMBERING_ICON_SIZE.SMALL) {
    return (
      <Common
        lineColor={lineColor}
        threeLetterCode={threeLetterCode}
        lineSymbol={lineSymbol}
        stationNumber={stationNumber}
        size={size}
        withOutline={withOutline}
      />
    );
  }

  return (
    <View
      style={
        allowScaling && {
          transform: [{ scale: 0.8 }],
          transformOrigin: 'bottom',
          paddingVertical: isTablet ? 8 : 4,
          paddingHorizontal: isTablet ? 8 : 4,
        }
      }
    >
      <Common
        lineColor={lineColor}
        threeLetterCode={threeLetterCode}
        lineSymbol={lineSymbol}
        stationNumber={stationNumber}
        withOutline={withOutline}
      />
    </View>
  );
};
export default NumberingIconSquare;
