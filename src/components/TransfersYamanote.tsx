import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RFValue } from 'react-native-responsive-fontsize';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { parenthesisRegexp } from '../constants/regexp';
import useGetLineMark from '../hooks/useGetLineMark';
import { Line, Station } from '../models/StationAPI';
import { translate } from '../translation';
import isTablet from '../utils/isTablet';
import TransferLineDot from './TransferLineDot';
import TransferLineMark from './TransferLineMark';

interface Props {
  onPress: () => void;
  lines: Line[];
  station: Station | undefined;
}

const styles = StyleSheet.create({
  transferLine: {
    flex: isTablet ? 0 : 1,
    marginBottom: isTablet ? 32 : 8,
  },
  header: {
    backgroundColor: '#ccc',
    alignItems: 'center',
    padding: 4,
  },
  headerText: {
    fontSize: RFValue(16),
    fontWeight: 'bold',
  },
  transferList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    padding: isTablet ? 32 : 24,
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

const TransfersYamanote: React.FC<Props> = ({
  onPress,
  station,
  lines,
}: Props) => {
  const { left: safeArealeft, right: safeAreaRight } = useSafeAreaInsets();
  const getLineMarkFunc = useGetLineMark();

  const flexBasis = useMemo(() => `${100 / 3}%`, []);

  const renderTransferLines = (): (JSX.Element | null)[] =>
    lines.map((line) => {
      if (!station) {
        return null;
      }
      const lineMark = getLineMarkFunc(station, line);

      return (
        <View
          style={[
            styles.transferLine,
            {
              marginLeft: safeArealeft,
              marginRight: safeAreaRight,
              flexBasis,
            },
          ]}
          key={line.id}
        >
          <View style={styles.transferLineInner}>
            {lineMark ? (
              <TransferLineMark line={line} mark={lineMark} size="small" />
            ) : (
              <TransferLineDot line={line} />
            )}

            <View style={styles.lineNameContainer}>
              <Text style={styles.lineName}>
                {line.name.replace(parenthesisRegexp, '')}
              </Text>
              <Text style={styles.lineNameEn}>
                {line.nameR.replace(parenthesisRegexp, '')}
              </Text>
            </View>
          </View>
        </View>
      );
    });

  return (
    <>
      <TouchableOpacity activeOpacity={1} onPress={onPress}>
        <View style={styles.header}>
          <Text style={styles.headerText}>{translate('transferYamanote')}</Text>
        </View>
      </TouchableOpacity>
      <ScrollView>
        <TouchableOpacity activeOpacity={1} onPress={onPress}>
          <View style={styles.transferList}>{renderTransferLines()}</View>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
};

export default TransfersYamanote;
