import React from 'react';
import { StyleSheet, View } from 'react-native';
import { isIPad } from '../../helpers/ipad';
import { ILine } from '../../models/StationAPI';

interface IProps {
  line: ILine;
  small?: boolean;
}

const TransferLineDot = ({ line, small }: IProps) =>{
  const styles = StyleSheet.create({
    lineDot: {
      width: isIPad && !small ? 48 : 32,
      height: isIPad && !small ? 48 : 32,
    },
  });

  return (<View style={[styles.lineDot, { backgroundColor: `#${line.lineColorC}`}]} />);
};

export default TransferLineDot;
