import React, { useCallback, useMemo } from 'react';
import {
  FlatList,
  Platform,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Line, Station } from '~/@types/graphql';
import { NUMBERING_ICON_SIZE, parenthesisRegexp } from '../constants';
import { useGetLineMark, useTransferLines } from '../hooks';
import { translate } from '../translation';
import isTablet from '../utils/isTablet';
import { RFValue } from '../utils/rfValue';
import TransferLineDot from './TransferLineDot';
import TransferLineMark from './TransferLineMark';
import Typography from './Typography';

interface Props {
  onPress: (station?: Station) => void;
  station: Station;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
    fontSize: 24,
    fontWeight: 'bold',
  },
  transferList: {
    paddingTop: isTablet ? 32 : 24,
    padding: 24,
    alignSelf: 'center',
    alignItems: 'center',
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
  },
  lineNameEn: {
    fontSize: RFValue(12),
    color: '#333',
    fontWeight: 'bold',
  },
});

const TransfersYamanote: React.FC<Props> = ({ onPress, station }: Props) => {
  const getLineMarkFunc = useGetLineMark();
  const lines = useTransferLines();
  const dim = useWindowDimensions();

  const flexBasis = useMemo(() => dim.width / 3, [dim.width]);

  const renderTransferLine = useCallback(
    ({ item: line }: { item: Line; index: number }) => {
      if (!station) {
        return null;
      }
      const lineMark = getLineMarkFunc({ line });

      return (
        <SafeAreaView
          style={[
            styles.transferLine,
            {
              flexBasis,
            },
          ]}
          key={line.id}
        >
          <View style={styles.transferLineInner}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={() =>
                onPress({
                  ...line.station,
                  __typename: 'Station',
                  line,
                  lines,
                } as Station)
              }
            >
              {lineMark ? (
                <TransferLineMark
                  line={line}
                  mark={lineMark}
                  size={NUMBERING_ICON_SIZE.MEDIUM}
                />
              ) : (
                <TransferLineDot line={line} />
              )}
            </TouchableOpacity>

            <View style={styles.lineNameContainer}>
              <TouchableOpacity
                activeOpacity={1}
                onPress={() =>
                  onPress({
                    ...line.station,
                    __typename: 'Station',
                    line,
                    lines,
                  } as Station)
                }
              >
                <Typography style={styles.lineName}>
                  {line.nameShort?.replace(parenthesisRegexp, '')}
                </Typography>
                <Typography style={styles.lineNameEn}>
                  {line.nameRoman?.replace(parenthesisRegexp, '')}
                </Typography>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      );
    },
    [flexBasis, onPress, station, getLineMarkFunc, lines]
  );

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={1}
      onPress={() => onPress()}
    >
      <View style={styles.header}>
        <Typography style={styles.headerText}>
          {translate('transferYamanote')}
        </Typography>
      </View>
      <FlatList
        data={lines}
        keyExtractor={(item) => (item.id ?? 0).toString()}
        renderItem={renderTransferLine}
        contentContainerStyle={styles.transferList}
        numColumns={2}
        removeClippedSubviews={Platform.OS === 'android'}
      />
    </TouchableOpacity>
  );
};

export default React.memo(TransfersYamanote);
