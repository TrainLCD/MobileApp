import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ILine } from '../../models/StationAPI';

interface IProps {
  lines: ILine[];
}

const styles = StyleSheet.create({
  bottom: {
    flex: 1,
    padding: 24,
  },
  headingText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#555',
    textAlign: 'center',
  },
  transferList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingTop: 24,
  },
  transferLine: {
    flexDirection: 'row',
    flexBasis: '50%',
    alignItems: 'center',
  },
  lineDot: {
    width: 24,
    height: 24,
    marginRight: 4,
  },
  lineName: {
    fontSize: 24,
    color: '#333',
    fontWeight: 'bold',
  },
});

const Transfers = (props: IProps) => {
  const { lines } = props;
  const renderTransferLines = () => (
    lines.map((line) => (
      <View style={styles.transferLine} key={line.id}>
        <View style={[styles.lineDot, { backgroundColor: `#${line.lineColorC}`}]} />
        <Text style={styles.lineName}>{line.name}</Text>
      </View>
    ))
  );

  return (
      <View style={styles.bottom}>
        <Text style={styles.headingText}>のりかえ</Text>

        <View style={styles.transferList}>
          {renderTransferLines()}
        </View>
      </View>
  );
};

export default Transfers;
