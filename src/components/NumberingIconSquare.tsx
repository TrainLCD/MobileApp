import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { withAnchorPoint } from 'react-native-anchor-point';
import FONTS from '../constants/fonts';
import isTablet from '../utils/isTablet';

type Props = {
  stationNumber: string;
  lineColor: string;
  threeLetterCode?: string;
  allowScaling: boolean;
};

const styles = StyleSheet.create({
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
    lineHeight: isTablet ? 24 * 1.5 : 24,
    fontSize: isTablet ? 24 * 1.5 : 24,
    fontFamily: FONTS.FrutigerNeueLTProBold,
  },
  lineSymbol: {
    lineHeight: isTablet ? 24 * 1.5 : 24,
    fontSize: isTablet ? 24 * 1.5 : 24,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
    marginTop: 4,
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
  threeLetterCode: string | undefined;
  tlcPad: ViewStyle;
  lineSymbol: string;
  stationNumber: string;
};

const Common = ({
  lineColor,
  threeLetterCode,
  tlcPad,
  lineSymbol,
  stationNumber,
}: CommonCompProps) => {
  return (
    <View
      style={[
        styles.root,
        { borderColor: lineColor },
        !threeLetterCode && tlcPad,
      ]}
    >
      <Text style={styles.lineSymbol}>{lineSymbol}</Text>
      <Text style={styles.stationNumber}>{stationNumber}</Text>
    </View>
  );
};

const NumberingIconSquare: React.FC<Props> = ({
  stationNumber: stationNumberRaw,
  lineColor,
  threeLetterCode,
  allowScaling,
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = stationNumberRaw.split('-');
  const stationNumber = stationNumberRest.join('');
  const tlcPad: ViewStyle = {
    marginVertical: isTablet ? 8 : 4,
    marginHorizontal: isTablet ? 8 : 4,
  };

  if (threeLetterCode) {
    return (
      <View
        style={[
          styles.tlcContainer,
          withAnchorPoint(
            { transform: [{ scale: 0.7 }] },
            { x: 0, y: 1.2 },
            {
              width: isTablet ? 72 * 1.5 : 72,
              height: isTablet ? 72 * 1.5 : 72,
            }
          ),
        ]}
      >
        <Text style={styles.tlcText}>{threeLetterCode}</Text>
        <Common
          lineColor={lineColor}
          tlcPad={tlcPad}
          threeLetterCode={threeLetterCode}
          lineSymbol={lineSymbol}
          stationNumber={stationNumber}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        allowScaling &&
          withAnchorPoint(
            { transform: [{ scale: 0.8 }] },
            { x: 0, y: 1.2 },
            {
              width: isTablet ? 72 * 1.5 : 72,
              height: isTablet ? 72 * 1.5 : 72,
            }
          ),
      ]}
    >
      <Common
        lineColor={lineColor}
        threeLetterCode={threeLetterCode}
        tlcPad={tlcPad}
        lineSymbol={lineSymbol}
        stationNumber={stationNumber}
      />
    </View>
  );
};

NumberingIconSquare.defaultProps = {
  threeLetterCode: undefined,
};

export default NumberingIconSquare;
