import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ILine } from '../../models/StationAPI';

interface IProps {
  lines: ILine[];
}

const styles = StyleSheet.create({
  transferLine: {
    flexBasis: '50%',
    marginBottom: 8,
  },
  bottom: {
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
  transferLineInner: {
    flexDirection: 'row',
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
        <View style={styles.transferLineInner} key={line.id}>
          <View style={[styles.lineDot, { backgroundColor: `#${line.lineColorC}`}]} />
          <Text style={styles.lineName}>{line.name}</Text>
        </View>
      </View>
    ))
  );

  return (
      <ScrollView contentContainerStyle={styles.bottom}>
        <Text style={styles.headingText}>のりかえ</Text>

        <View style={styles.transferList}>
          {renderTransferLines()}
        </View>
      </ScrollView>
  );
};

export default Transfers;
