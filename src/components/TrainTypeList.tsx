import { useAtomValue } from 'jotai';
import React, { useCallback, useMemo } from 'react';
import {
  FlatList,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Line, TrainType } from '~/@types/graphql';
import { useCurrentLine } from '~/hooks';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { isJapanese, translate } from '~/translation';
import { RFValue } from '~/utils/rfValue';
import Typography from './Typography';

const styles = StyleSheet.create({
  root: {
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
    marginTop: 2,
    lineHeight: RFValue(16),
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

const ItemCell = React.memo(
  ({
    item,
    onSelect,
  }: {
    item: TrainType;
    onSelect: (item: TrainType) => void;
  }) => {
    const currentLine = useCurrentLine();

    const lines = useMemo(
      () =>
        item.lines
          ?.reduce<Line[]>((acc, cur) => {
            if (!acc || acc.every((l) => l.nameShort !== cur.nameShort)) {
              return acc.concat(cur);
            }

            return acc;
          }, [])
          .filter((l) => l.id !== currentLine?.id) ?? [],
      [currentLine?.id, item.lines]
    );

    const isAllSameType = useMemo(
      () =>
        Array.from(new Set(item.lines?.map((l) => l.trainType?.typeId) ?? []))
          .length === 1,
      [item.lines]
    );

    if (!lines.length) {
      return (
        <TouchableOpacity style={styles.cell} onPress={() => onSelect(item)}>
          <Typography style={styles.stationNameText}>
            {isJapanese ? item.name : item.nameRoman}
          </Typography>
          <Typography style={styles.descriptionText}>
            {isJapanese ? '直通運転なし' : 'Not connected to other line'}
          </Typography>
        </TouchableOpacity>
      );
    }

    if (isAllSameType) {
      return (
        <TouchableOpacity style={styles.cell} onPress={() => onSelect(item)}>
          <Typography style={styles.stationNameText}>
            {isJapanese ? item.name : item.nameRoman}
          </Typography>
          <Typography style={styles.descriptionText}>
            {isJapanese
              ? lines.map((l) => l?.nameShort).join('、')
              : lines.map((l) => l.nameRoman ?? '').join(', ')}
            {isJapanese ? '直通' : ''}
          </Typography>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity style={styles.cell} onPress={() => onSelect(item)}>
        <Typography style={styles.stationNameText}>
          {isJapanese ? item.name : item.nameRoman}
        </Typography>
        <Typography style={styles.descriptionText}>
          {isJapanese
            ? lines
                .map((l) => `${l.nameShort}内${l.trainType?.name ?? ''}`)
                .join('、')
            : lines
                .map(
                  (l) =>
                    `${l.nameRoman}${
                      l.trainType?.nameRoman ? ` ${l.trainType.nameRoman}` : ''
                    }`
                )
                .join(', ')}
        </Typography>
      </TouchableOpacity>
    );
  }
);

export const TrainTypeList = ({
  data,
  onSelect,
}: {
  data: TrainType[];
  onSelect: (item: TrainType) => void;
}) => {
  const isLEDTheme = useAtomValue(isLEDThemeAtom);

  const renderItem = useCallback(
    ({ item }: { item: TrainType; index: number }) => {
      return <ItemCell item={item} onSelect={onSelect} />;
    },
    [onSelect]
  );
  const keyExtractor = useCallback(
    (item: TrainType, index: number) =>
      item.groupId?.toString() ?? item.id?.toString() ?? index.toString(),
    []
  );
  const { bottom: safeAreaBottom } = useSafeAreaInsets();

  return (
    <FlatList
      initialNumToRender={data.length}
      removeClippedSubviews={Platform.OS === 'android'}
      style={[
        styles.root,
        {
          borderColor: isLEDTheme ? '#fff' : '#aaa',
          marginBottom: safeAreaBottom,
        },
      ]}
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ItemSeparatorComponent={Separator}
      ListFooterComponent={data.length ? Separator : undefined}
      ListEmptyComponent={() => (
        <Typography style={styles.emptyText}>
          {translate('trainTypeListEmpty')}
        </Typography>
      )}
    />
  );
};
