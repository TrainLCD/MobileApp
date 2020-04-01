import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ILine } from '../../models/StationAPI';

interface IProps {
  line: ILine;
}

const TransferLineDot = ({ line }: IProps) => {
  const styles = StyleSheet.create({
    lineDot: {
      width: 32,
      height: 32,
    },
  });

  return (<View style={[styles.lineDot, { backgroundColor: `#${line.lineColorC}`}]} />);
};

export default TransferLineDot;
