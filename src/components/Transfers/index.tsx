import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import i18n from 'i18n-js';
import { isIPad } from '../../helpers/ipad';
import { getLineMark } from '../../lineMark';
import { ILine } from '../../models/StationAPI';
import TransferLineDot from '../TransferLineDot';
import TransferLineMark from '../TransferLineMark';

interface IProps {
  lines: ILine[];
}

const styles = StyleSheet.create({
  transferLine: {
    flexBasis: '50%',
    marginBottom: isIPad ? 24 : 8,
  },
  bottom: {
    padding: 24,
  },
  headingText: {
    fontSize: isIPad ? 32 : 24,
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
  lineName: {
    fontSize: isIPad ? 32 : 24,
    color: '#333',
    fontWeight: 'bold',
  },
});

const Transfers = (props: IProps) => {
  const { lines } = props;
  const renderTransferLines = () => (
    lines.map((line) => {
      const lineMark = getLineMark(line);
      return (
      <View style={styles.transferLine} key={line.id}>
        <View style={styles.transferLineInner} key={line.id}>
          {lineMark ? <TransferLineMark line={line} mark={lineMark} /> : <TransferLineDot line={line} />}
          <Text style={styles.lineName}>{line.name}</Text>
        </View>
      </View>
    );
      })
  );

  return (
      <ScrollView contentContainerStyle={styles.bottom}>
        <Text style={styles.headingText}>{i18n.t('transfer')}</Text>

        <View style={styles.transferList}>
          {renderTransferLines()}
        </View>
      </ScrollView>
  );
};

export default Transfers;
