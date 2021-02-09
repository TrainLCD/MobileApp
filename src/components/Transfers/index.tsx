import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
  PlatformIOSStatic,
} from 'react-native';

import { TouchableWithoutFeedback } from 'react-native-gesture-handler';
import { getLineMark } from '../../lineMark';
import { Line } from '../../models/StationAPI';
import TransferLineDot from '../TransferLineDot';
import TransferLineMark from '../TransferLineMark';
import Heading from '../Heading';
import { isJapanese, translate } from '../../translation';

const { isPad } = Platform as PlatformIOSStatic;

interface Props {
  lines: Line[];
  onPress: () => void;
}

const styles = StyleSheet.create({
  transferLine: {
    flexBasis: '50%',
    marginBottom: isPad ? 16 : 8,
  },
  bottom: {
    padding: 24,
  },
  transferList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: isPad ? 32 : 24,
  },
  transferLineInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lineNameContainer: {
    width: '85%',
  },
  lineName: {
    fontSize: isPad ? 32 : 24,
    color: '#333',
    fontWeight: 'bold',
  },
  lineNameEn: {
    fontSize: isPad ? 16 : 12,
    color: '#333',
    fontWeight: 'bold',
  },
});

const Transfers: React.FC<Props> = ({ onPress, lines }: Props) => {
  const renderTransferLines = (): JSX.Element[] =>
    lines.map((line) => {
      const lineMark = getLineMark(line);
      return (
        <View style={styles.transferLine} key={line.id}>
          <View style={styles.transferLineInner}>
            {lineMark ? (
              <TransferLineMark line={line} mark={lineMark} />
            ) : (
              <TransferLineDot line={line} />
            )}
            {isJapanese ? (
              <View style={styles.lineNameContainer}>
                <Text style={styles.lineName}>{line.name}</Text>
                <Text style={styles.lineNameEn}>{line.nameR}</Text>
              </View>
            ) : (
              <Text style={styles.lineName}>{line.nameR}</Text>
            )}
          </View>
        </View>
      );
    });

  return (
    <ScrollView contentContainerStyle={styles.bottom}>
      <TouchableWithoutFeedback onPress={onPress} style={{ flex: 1 }}>
        <Heading>{translate('transfer')}</Heading>

        <View style={styles.transferList}>{renderTransferLines()}</View>
      </TouchableWithoutFeedback>
    </ScrollView>
  );
};

export default Transfers;
