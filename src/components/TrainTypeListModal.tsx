import { useAtomValue } from 'jotai';
import uniqBy from 'lodash/uniqBy';
import { useCallback, useMemo } from 'react';
import { FlatList, Platform, StyleSheet, View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import type { Line, Station, TrainType } from '~/@types/graphql';
import { LED_THEME_BG_COLOR } from '~/constants/color';
import navigationState from '~/store/atoms/navigation';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { isJapanese, translate } from '~/translation';
import isTablet from '~/utils/isTablet';
import { RFValue } from '~/utils/rfValue';
import Button from './Button';
import { CommonCard } from './CommonCard';
import { CustomModal } from './CustomModal';
import { EmptyLineSeparator } from './EmptyLineSeparator';
import { Heading } from './Heading';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  contentView: {
    width: '100%',
    borderRadius: 8,
    minHeight: 512,
    overflow: 'hidden',
  },
  closeButtonContainer: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: '100%',
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  closeButton: { width: '100%' },
  closeButtonText: { fontWeight: 'bold' },
  headerContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: 72,
    zIndex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  subtitle: {
    width: '100%',
    fontSize: RFValue(12),
  },
  title: {
    width: '100%',
  },
  flatListContentContainer: {
    paddingHorizontal: 24,
    paddingVertical: 72,
  },
});

type Props = {
  visible: boolean;
  line: Line | null;
  destination?: Station | null;
  loading?: boolean;
  onClose: () => void;
  onSelect: (trainType: TrainType) => void;
};

export const TrainTypeListModal = ({
  visible,
  line,
  destination,
  loading,
  onClose,
  onSelect,
}: Props) => {
  const { fetchedTrainTypes } = useAtomValue(navigationState);

  const isLEDTheme = useAtomValue(isLEDThemeAtom);

  const title = useMemo(() => {
    if (!destination) {
      return (isJapanese ? line?.nameShort : line?.nameRoman) ?? '';
    }

    return isJapanese
      ? `${destination.name ?? ''}方面`
      : `${destination.nameRoman ?? ''}`;
  }, [destination, line?.nameRoman, line?.nameShort]);
  const subtitle = useMemo(() => {
    if (!destination) {
      return '';
    }

    return isJapanese ? `${line?.nameShort ?? ''}` : `${line?.nameRoman ?? ''}`;
  }, [destination, line?.nameRoman, line?.nameShort]);

  const renderItem = useCallback(
    ({ item }: { item: TrainType }) => {
      const itemLine = item.line;
      const lines = uniqBy(item.lines ?? [], 'id');

      if (!itemLine || !line) return null;

      // 選択された路線がこの列車種別の路線リストに含まれているかチェック
      const selectedLineIndex = lines.findIndex((l) => l.id === line.id);
      if (selectedLineIndex === -1) return null;

      if (destination) {
        const destinationLineIndex = lines.findIndex(
          (l) => l.id === destination.line?.id
        );

        if (destinationLineIndex === -1) {
          return null;
        }

        // 選択された路線と目的地の路線が同じ場合は、選択された路線より後の路線を表示
        let viaLines: Line[];
        if (selectedLineIndex === destinationLineIndex) {
          viaLines = lines.slice(selectedLineIndex + 1);
        } else {
          const [start, end] =
            selectedLineIndex <= destinationLineIndex
              ? [selectedLineIndex, destinationLineIndex]
              : [destinationLineIndex, selectedLineIndex];
          let segment = lines.slice(start, end + 1);
          if (selectedLineIndex > destinationLineIndex) {
            segment = segment.reverse();
          }
          viaLines = segment.slice(1);
        }

        const title = `${isJapanese ? item.name : item.nameRoman}`;
        const subtitle = isJapanese
          ? `${Array.from(new Set(viaLines.map((l) => l.nameShort))).join(
              '・'
            )}${viaLines.length ? '直通' : ''}`
          : viaLines.length
            ? `Via ${Array.from(new Set(viaLines.map((l) => l.nameRoman))).join(
                ', '
              )}`
            : '';

        return (
          <CommonCard
            line={line}
            title={title}
            subtitle={subtitle}
            onPress={() => onSelect(item)}
          />
        );
      }

      const title = `${isJapanese ? item.name : item.nameRoman}`;
      const subtitle = isJapanese
        ? lines.map((l) => l.nameShort).join('・')
        : lines.map((l) => l.nameRoman).join(', ');

      return (
        <CommonCard
          line={line}
          title={title}
          subtitle={subtitle}
          onPress={() => onSelect(item)}
        />
      );
    },
    [destination, line, onSelect]
  );

  const keyExtractor = useCallback(
    (tt: TrainType, index: number) => tt.id?.toString() ?? index.toString(),
    []
  );

  const trainTypes = useMemo(() => {
    const trainTypes = fetchedTrainTypes
      .map((tt) => {
        const nestedTrainType = tt.lines?.find((l) => l.id === line?.id)
          ?.trainType as TrainType | undefined;
        return { ...tt, ...nestedTrainType, id: tt.id };
      })
      .filter((tt) => tt) as TrainType[];

    return trainTypes;
  }, [fetchedTrainTypes, line?.id]);

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      backdropStyle={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      containerStyle={styles.root}
      contentContainerStyle={[
        styles.contentView,
        {
          backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : '#fff',
        },
        isTablet && {
          width: '80%',
          maxHeight: '90%',
          borderRadius: 16,
        },
      ]}
    >
      <View
        style={[
          styles.headerContainer,
          {
            backgroundColor: isLEDTheme ? '#212121' : '#fff',
          },
        ]}
      >
        {destination ? (
          <Heading style={styles.subtitle}>{subtitle}</Heading>
        ) : null}
        <Heading singleLine style={styles.title}>
          {title}
        </Heading>
      </View>

      <FlatList<TrainType>
        style={StyleSheet.absoluteFill}
        data={trainTypes}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ItemSeparatorComponent={EmptyLineSeparator}
        scrollEventThrottle={16}
        contentContainerStyle={styles.flatListContentContainer}
        removeClippedSubviews={Platform.OS === 'android'}
        ListEmptyComponent={
          loading ? (
            <SkeletonPlaceholder borderRadius={4} speed={1500}>
              <SkeletonPlaceholder.Item width="100%" height={72} />
            </SkeletonPlaceholder>
          ) : null
        }
      />
      <View
        style={[
          styles.closeButtonContainer,
          {
            backgroundColor: isLEDTheme ? '#212121' : '#fff',
          },
        ]}
      >
        <Button
          style={styles.closeButton}
          textStyle={styles.closeButtonText}
          onPress={onClose}
        >
          {translate('close')}
        </Button>
      </View>
    </CustomModal>
  );
};
