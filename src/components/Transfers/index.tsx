import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import i18n from 'i18n-js';
import { TouchableWithoutFeedback } from 'react-native-gesture-handler';
import { getLineMark } from '../../lineMark';
import { ILine } from '../../models/StationAPI';
import TransferLineDot from '../TransferLineDot';
import TransferLineMark from '../TransferLineMark';

interface IProps {
  lines: ILine[];
  onPress: () => void;
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
  lineName: {
    fontSize: 24,
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
          <Text style={styles.lineName}>{i18n.locale === 'ja' ? line.name : line.nameR}</Text>
        </View>
      </View>
    );
      })
  );

  return (
      <ScrollView contentContainerStyle={styles.bottom}>
        <TouchableWithoutFeedback onPress={props.onPress} style={{ flex: 1 }}>
          <Text style={styles.headingText}>{i18n.t('transfer')}</Text>

          <View style={styles.transferList}>
            {renderTransferLines()}
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>
  );
};

export default Transfers;
