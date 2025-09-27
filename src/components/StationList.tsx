import { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Station } from '~/gen/proto/stationapi_pb';
import { useThemeStore } from '../hooks';
import { APP_THEME } from '../models/Theme';
import { isJapanese, translate } from '../translation';
import { generateStationGroupTestId } from '../utils/generateTestID';
import { RFValue } from '../utils/rfValue';
import Typography from './Typography';

const styles = StyleSheet.create({
  list: {
    width: '100%',
    alignSelf: 'center',
    borderWidth: 1,
    flex: 1,
    marginVertical: 12,
  },
  cell: { padding: 12 },
  stationNameText: {
    fontSize: RFValue(14),
  },
  descriptionText: {
    fontSize: RFValue(11),
    marginTop: 8,
  },
  separator: { height: 1, width: '100%', backgroundColor: '#aaa' },
  emptyText: {
    textAlign: 'center',
    marginTop: 12,
    fontSize: RFValue(14),
    fontWeight: 'bold',
  },
});

const Separator = () => <View style={styles.separator} />;

const ListEmptyComponent = ({ fromRoutes }: { fromRoutes: boolean }) => (
  <Typography style={styles.emptyText}>
    {fromRoutes
      ? translate('matchedStationListEmpty')
      : translate('stationListEmpty')}
  </Typography>
);

const ItemCell = ({
  item,
  onSelect,
  withoutTransfer,
}: {
  item: Station;
  onSelect: (item: Station) => void;
  withoutTransfer?: boolean;
}) => {
  const ownLine = useMemo(() => item.line, [item.line]);
  const otherLines = useMemo(
    () => item.lines.filter((l) => l.id !== ownLine?.id),
    [item.lines, ownLine?.id]
  );
  const transferLabel = useMemo(
    () => (isJapanese ? '接続路線: ' : 'Transfer: '),
    []
  );
  const transferText: string = useMemo(() => {
    if (withoutTransfer) {
      return item.lines
        .map((l) => (isJapanese ? l.nameShort : l.nameRoman))
        .join(isJapanese ? '、' : ', ');
    }

    return `${isJapanese ? ownLine?.nameShort : ownLine?.nameRoman}${' '}${
      otherLines.length ? transferLabel : ''
    }${' '}${otherLines
      .map((l) => (isJapanese ? l.nameShort : l.nameRoman))
      .join(isJapanese ? '、' : ', ')
      .replaceAll('\n', '')}`;
  }, [
    item.lines,
    otherLines,
    ownLine?.nameRoman,
    ownLine?.nameShort,
    transferLabel,
    withoutTransfer,
  ]);

  return (
    <TouchableOpacity
      style={styles.cell}
      onPress={() => onSelect(item)}
      testID={generateStationGroupTestId(item)}
    >
      <Typography style={styles.stationNameText}>
        {isJapanese ? item.name : item.nameRoman}
      </Typography>
      <Typography style={styles.descriptionText}>{transferText}</Typography>
    </TouchableOpacity>
  );
};

export const StationList = ({
  data,
  onSelect,
  withoutTransfer,
  fromRoutes,
}: {
  data: Station[];
  onSelect: (item: Station) => void;
  withoutTransfer?: boolean;
  fromRoutes?: boolean;
}) => {
  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED);

  const renderItem = useCallback(
    ({ item }: { item: Station; index: number }) => {
      return (
        <ItemCell
          withoutTransfer={withoutTransfer}
          item={item}
          onSelect={onSelect}
        />
      );
    },
    [onSelect, withoutTransfer]
  );
  const keyExtractor = useCallback((item: Station) => item.id.toString(), []);
  const { bottom: safeAreaBottom } = useSafeAreaInsets();

  return (
    <FlatList
      initialNumToRender={data.length}
      style={[
        styles.list,
        {
          marginBottom: safeAreaBottom,
          borderColor: isLEDTheme ? '#fff' : '#aaa',
        },
      ]}
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ItemSeparatorComponent={Separator}
      ListEmptyComponent={
        <ListEmptyComponent fromRoutes={fromRoutes ?? false} />
      }
    />
  );
};
