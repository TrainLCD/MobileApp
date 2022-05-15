import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RFValue } from 'react-native-responsive-fontsize';
import { CommonNumberingIconSize } from '../constants/numbering';
import isTablet from '../utils/isTablet';

type Props = {
  size?: CommonNumberingIconSize;
};

const styles = StyleSheet.create({
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
  stationNumber: {
    color: 'black',
    fontSize: isTablet ? RFValue(28 * 1.2) : RFValue(28),
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

const NumberingIconSapporo: React.FC<Props> = ({ size = 'normal' }: Props) => {
  return (
    <View style={styles.root}>
      <Text style={styles.stationNumber}>01</Text>
    </View>
  );
};

NumberingIconSapporo.defaultProps = {
  size: undefined,
};

export default NumberingIconSapporo;
