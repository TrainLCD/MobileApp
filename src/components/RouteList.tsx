import uniqBy from 'lodash/uniqBy';
import { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import type { Route, Station } from '~/@types/graphql';
import { useCurrentStation, useThemeStore } from '../hooks';
import { APP_THEME } from '../models/Theme';
import { isJapanese } from '../translation';
import { RFValue } from '../utils/rfValue';
import Typography from './Typography';

const styles = StyleSheet.create({
  list: {
    width: '100%',
    height: '100%',
    alignSelf: 'center',
    borderWidth: 1,
    flex: 1,
  },
  cell: { padding: 12 },
  stationNameText: {
    fontSize: RFValue(14),
  },
  descriptionText: {
    fontSize: RFValue(11),
    marginTop: 2,
    lineHeight: RFValue(16),
  },
  separator: { height: 1, width: '100%', backgroundColor: '#aaa' },
});

const Separator = () => <View style={styles.separator} />;

const ItemCell = ({
  item,
  loading,
  destination,
  onSelect,
}: {
  item: Route;
  loading: boolean;
  destination: Station;
  onSelect: (item: Route) => void;
}) => {
  const currentStation = useCurrentStation();

  const stops = useMemo(() => {
    if (!item.stops) {
      return [];
    }
    const curIndex = item.stops.findIndex(
      (s) => s.groupId === Number(currentStation?.groupId)
    );
    if (curIndex === -1) {
      return [];
    }

    const destIndex = item.stops.findIndex(
      (s) => s.groupId === destination.groupId
    );

    if (destIndex < curIndex) {
      return item.stops.slice(0, curIndex).reverse();
    }

    return item.stops.slice(curIndex + 1);
  }, [currentStation?.groupId, destination.groupId, item.stops]);

  const trainType = useMemo(() => stops[0]?.trainType, [stops]);

  const lineNameTitle = useMemo(() => {
    if (!isJapanese) {
      const lineName = stops[0]?.line?.nameRoman;
      const typeName = trainType?.nameRoman ?? 'Local';

      return `${lineName} ${typeName}`;
    }
    const lineName = stops[0]?.line?.nameShort;
    const typeName = trainType?.name ?? '普通または各駅停車';

    return `${lineName} ${typeName}`;
  }, [stops, trainType]);

  const lines = useMemo(
    () =>
      uniqBy(
        stops.flatMap((s) => s.line).filter((l) => l !== undefined),
        'id'
      ).slice(1),
    [stops]
  );

  const otherTypeStops = useMemo(
    () =>
      uniqBy(
        stops
          .filter((s) => s !== undefined)
          .filter((s) => s.trainType?.typeId !== trainType?.typeId)
          .filter((s) => s.line !== undefined && s.trainType !== undefined),
        'trainType.id'
      ),
    [stops, trainType?.typeId]
  );

  const connectedTypesText = useMemo(() => {
    if (!lines.length) {
      return isJapanese ? '直通運転なし' : 'Not connected to other line';
    }

    if (!otherTypeStops.length) {
      return isJapanese
        ? `${lines.map((l) => l?.nameShort).join('、')}直通`
        : `${lines.map((l) => l?.nameRoman).join(', ')}`;
    }

    return isJapanese
      ? `${otherTypeStops.map((s: Station) => `${s.line?.nameShort}から${s.trainType?.name}`).join('、')}に接続`
      : `${otherTypeStops.map((s: Station) => `Connected to ${s.line?.nameRoman} ${s.trainType?.nameRoman}`).join(', ')}`;
  }, [otherTypeStops, lines]);

  return (
    <TouchableOpacity
      style={styles.cell}
      onPress={() => onSelect(item)}
      disabled={loading}
    >
      <Typography style={styles.stationNameText}>{lineNameTitle}</Typography>
      <Typography style={styles.descriptionText} numberOfLines={1}>
        {connectedTypesText}
      </Typography>
    </TouchableOpacity>
  );
};

export const RouteList = ({
  routes,
  destination,
  onSelect,
  loading,
}: {
  routes: Route[];
  destination: Station;
  onSelect: (item: Route | undefined) => void;
  loading: boolean;
}) => {
  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED);

  const renderItem = useCallback(
    ({ item }: { item: Route; index: number }) => {
      return (
        <ItemCell
          item={item}
          destination={destination}
          onSelect={onSelect}
          loading={loading}
        />
      );
    },
    [destination, loading, onSelect]
  );
  const keyExtractor = useCallback(
    (item: Route) => (item.id ?? 0).toString(),
    []
  );

  return (
    <FlatList
      initialNumToRender={routes.length}
      style={[
        styles.list,
        {
          borderColor: isLEDTheme ? '#fff' : '#aaa',
        },
      ]}
      data={routes}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ItemSeparatorComponent={Separator}
      ListFooterComponent={Separator}
    />
  );
};
