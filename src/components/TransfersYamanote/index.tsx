import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
  PlatformIOSStatic,
} from 'react-native';

import { RFValue } from 'react-native-responsive-fontsize';
import { TouchableWithoutFeedback } from 'react-native-gesture-handler';
import { getLineMark } from '../../lineMark';
import { Line } from '../../models/StationAPI';
import TransferLineDot from '../TransferLineDot';
import TransferLineMark from '../TransferLineMark';
import { isJapanese, translate } from '../../translation';
import { parenthesisRegexp } from '../../constants/regexp';
import isAndroidTablet from '../../utils/isAndroidTablet';

const { isPad } = Platform as PlatformIOSStatic;
const isTablet = isPad || isAndroidTablet;

interface Props {
  onPress: () => void;
  lines: Line[];
}

const styles = StyleSheet.create({
  transferLine: {
    marginBottom: isTablet ? 32 : 8,
  },
  header: {
    backgroundColor: '#ccc',
    alignItems: 'center',
    padding: 4,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  transferList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingTop: isTablet ? 32 : 24,
    padding: 24,
  },
  transferLineInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lineNameContainer: {
    width: '100%',
  },
  lineName: {
    fontSize: RFValue(18),
    color: '#333',
    fontWeight: 'bold',
    width: '85%',
  },
  lineNameEn: {
    fontSize: RFValue(12),
    color: '#333',
    fontWeight: 'bold',
  },
});

const TransfersYamanote: React.FC<Props> = ({ onPress, lines }: Props) => {
  const flexBasis = useMemo(() => {
    switch (lines.length) {
      case 1:
        return '100%';
      case 2:
        return '50%';
      default:
        return `${100 / 3}%`;
    }
  }, [lines.length]);

  const renderTransferLines = (): JSX.Element[] =>
    lines.map((line) => {
      const lineMark = getLineMark(line);
      return (
        <View
          style={[
            styles.transferLine,
            {
              flexBasis,
            },
          ]}
          key={line.id}
        >
          <View style={styles.transferLineInner}>
            {lineMark ? (
              <TransferLineMark line={line} mark={lineMark} />
            ) : (
              <TransferLineDot line={line} />
            )}
            {isJapanese ? (
              <View style={styles.lineNameContainer}>
                <Text style={styles.lineName}>
                  {line.name.replace(parenthesisRegexp, '')}
                </Text>
                <Text style={styles.lineNameEn}>
                  {line.nameR.replace(parenthesisRegexp, '')}
                </Text>
              </View>
            ) : (
              <Text style={styles.lineName}>
                {line.nameR.replace(parenthesisRegexp, '')}
              </Text>
            )}
          </View>
        </View>
      );
    });

  return (
    <ScrollView>
      <TouchableWithoutFeedback onPress={onPress} containerStyle={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.headerText}>{translate('transferYamanote')}</Text>
        </View>

        <View style={styles.transferList}>{renderTransferLines()}</View>
      </TouchableWithoutFeedback>
    </ScrollView>
  );
};

export default TransfersYamanote;
