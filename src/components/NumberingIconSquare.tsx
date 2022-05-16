import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { withAnchorPoint } from 'react-native-anchor-point';
import FONTS from '../constants/fonts';
import isTablet from '../utils/isTablet';

type Props = {
  stationNumber: string;
  lineColor: string;
  threeLetterCode?: string;
};

const styles = StyleSheet.create({
  root: {
    width: isTablet ? 64 * 1.25 : 64,
    height: isTablet ? 64 * 1.25 : 64,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderRadius: 8,
    borderWidth: isTablet ? 6 * 1.25 : 6,
    backgroundColor: 'white',
  },
  tlcContainer: {
    backgroundColor: '#231e1f',
    borderWidth: 1,
    borderColor: 'white',
    borderRadius: 16,
    paddingVertical: isTablet ? 8 : 4,
    paddingHorizontal: isTablet ? 8 : 4,
  },
  tlcText: {
    color: 'white',
    textAlign: 'center',
    lineHeight: isTablet ? 20 * 1.5 : 20,
    fontSize: isTablet ? 20 * 1.5 : 20,
    fontFamily: FONTS.FrutigerNeueLTProBold,
  },
  lineSymbol: {
    lineHeight: isTablet ? 20 * 1.5 : 20,
    fontSize: isTablet ? 20 * 1.5 : 20,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
    marginTop: 4,
  },
  stationNumber: {
    lineHeight: isTablet ? 30 * 1.25 : 30,
    fontSize: isTablet ? 30 * 1.25 : 30,
    marginTop: -4,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
  },
});

const NumberingIconSquare: React.FC<Props> = ({
  stationNumber: stationNumberRaw,
  lineColor,
  threeLetterCode,
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = stationNumberRaw.split('-');
  const stationNumber = stationNumberRest.join('');

  const Common = () => (
    <View style={[styles.root, { borderColor: lineColor }]}>
      <Text style={styles.lineSymbol}>{lineSymbol}</Text>
      <Text style={styles.stationNumber}>{stationNumber}</Text>
    </View>
  );

  if (threeLetterCode) {
    return (
      <View
        style={[
          styles.tlcContainer,
          withAnchorPoint(
            { transform: [{ scale: 0.8 }] },
            { x: 0, y: 1.2 },
            {
              width: isTablet ? 64 * 1.25 : 64,
              height: isTablet ? 64 * 1.25 : 64,
            }
          ),
        ]}
      >
        <Text style={styles.tlcText}>{threeLetterCode}</Text>
        <Common />
      </View>
    );
  }

  return <Common />;
};

NumberingIconSquare.defaultProps = {
  threeLetterCode: undefined,
};

export default NumberingIconSquare;
