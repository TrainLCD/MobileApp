import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { TouchableWithoutFeedback } from 'react-native-gesture-handler';
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

const TransfersYamanote: React.FC<Props> = ({
  onPress,
  station,
  lines,
}: Props) => {
  const { left: safeArealeft, right: safeAreaRight } = useSafeAreaInsets();
  const getLineMarkFunc = useGetLineMark();

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
