import React, { useCallback, useMemo } from 'react';
import {
  Dimensions,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type Line, Station } from '../../gen/proto/stationapi_pb';
import { NUMBERING_ICON_SIZE, parenthesisRegexp } from '../constants';
import useGetLineMark from '../hooks/useGetLineMark';
import useTransferLines from '../hooks/useTransferLines';
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
    width: '85%',
  },
  lineNameEn: {
    fontSize: RFValue(12),
    color: '#333',
    fontWeight: 'bold',
  },
});

const TransfersYamanote: React.FC<Props> = ({ onPress, station }: Props) => {
  const { left: safeAreaLeft, right: safeAreaRight } = useSafeAreaInsets();
  const getLineMarkFunc = useGetLineMark();
  const lines = useTransferLines();

  const flexBasis = useMemo(() => Dimensions.get('screen').width / 3, []);

  const renderTransferLine = useCallback(
    ({ item: line }: { item: Line; index: number }) => {
      if (!station) {
        return null;
      }
      const lineMark = getLineMarkFunc({ line });

      return (
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => onPress(new Station({ ...line.station, line, lines }))}
          style={[
            styles.transferLine,
            {
              marginLeft: safeAreaLeft,
              marginRight: safeAreaRight,
              flexBasis,
            },
          ]}
          key={line.id}
        >
          <View style={styles.transferLineInner}>
            {lineMark ? (
              <TransferLineMark
                line={line}
                mark={lineMark}
                size={NUMBERING_ICON_SIZE.MEDIUM}
              />
            ) : (
              <TransferLineDot line={line} />
            )}

            <View style={styles.lineNameContainer}>
              <Typography style={styles.lineName}>
                {line.nameShort.replace(parenthesisRegexp, '')}
              </Typography>
              <Typography style={styles.lineNameEn}>
                {line.nameRoman?.replace(parenthesisRegexp, '')}
              </Typography>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [
      flexBasis,
      onPress,
      station,
      getLineMarkFunc,
      lines,
      safeAreaLeft,
      safeAreaRight,
    ]
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
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderTransferLine}
        contentContainerStyle={styles.transferList}
        numColumns={2}
      />
    </TouchableOpacity>
  );
};

export default React.memo(TransfersYamanote);
