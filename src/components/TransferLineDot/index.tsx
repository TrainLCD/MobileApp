import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Line } from '../../models/StationAPI';

interface Props {
  line: Line;
}

const TransferLineDot: React.FC<Props> = ({ line }: Props) => {
  const styles = StyleSheet.create({
    lineDot: {
      width: 32,
      height: 32,
      borderRadius: 4,
      marginRight: 4,
    },
  });

  return (
    <View
      style={[styles.lineDot, { backgroundColor: `#${line.lineColorC}` }]}
    />
  );
};

export default TransferLineDot;
