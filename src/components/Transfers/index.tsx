import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import DeviceInfo from 'react-native-device-info';

import { TouchableWithoutFeedback } from 'react-native-gesture-handler';
import { getLineMark } from '../../lineMark';
import { Line } from '../../models/StationAPI';
import TransferLineDot from '../TransferLineDot';
import TransferLineMark from '../TransferLineMark';
import Heading from '../Heading';
import { isJapanese, translate } from '../../translation';

const { isTablet } = DeviceInfo;

interface Props {
  lines: Line[];
  onPress: () => void;
}

const styles = StyleSheet.create({
  transferLine: {
    flexBasis: '50%',
    marginBottom: isTablet ? 16 : 8,
  },
  bottom: {
    padding: 24,
  },
  headingText: {
    fontSize: isTablet ? 32 : 24,
    fontWeight: 'bold',
    color: '#555',
    textAlign: 'center',
  },
  transferList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: isTablet ? 32 : 24,
  },
  transferLineInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lineName: {
    fontSize: isTablet ? 32 : 24,
    color: '#333',
    fontWeight: 'bold',
    width: '85%',
  },
});

const Transfers: React.FC<Props> = ({ onPress, lines }: Props) => {
  const renderTransferLines = (): React.ReactElement[] =>
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
            <Text style={styles.lineName}>
              {isJapanese ? line.name : line.nameR}
            </Text>
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
