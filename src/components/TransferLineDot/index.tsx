import React from 'react';
import { StyleSheet, View } from 'react-native';
import { RFValue } from 'react-native-responsive-fontsize';
import { Line } from '../../models/StationAPI';

interface Props {
  line: Line;
  small?: boolean;
}

const TransferLineDot: React.FC<Props> = ({ line, small }: Props) => {
  const styles = StyleSheet.create({
    lineDot: {
      width: small ? RFValue(8) : 38,
      height: small ? RFValue(8) : 38,
      borderRadius: 1,
      marginRight: 4,
    },
  });

  return (
    <View
      style={[styles.lineDot, { backgroundColor: `#${line.lineColorC}` }]}
    />
  );
};

TransferLineDot.defaultProps = {
  small: undefined,
};

export default TransferLineDot;
