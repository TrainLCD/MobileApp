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

// 選択された路線と目的地の路線の間にある経由路線を取得する
const getViaLines = (
  lines: Line[],
  selectedLine: Line,
  destination?: Station | null
): Line[] => {
  const selectedLineIndex = lines.findIndex((l) => l.id === selectedLine.id);
  const linesWithoutCurrent = lines.filter((l) => l.id !== selectedLine.id);

  if (!destination) {
    return linesWithoutCurrent;
  }

  const destinationLineIndex = lines.findIndex(
    (l) => l.id === destination.line?.id
  );

  // 選択された路線と目的地の路線が同じ場合は、選択された路線より後の路線を表示
  if (selectedLineIndex === destinationLineIndex) {
    return lines.slice(selectedLineIndex + 1);
  }

  const start = Math.min(selectedLineIndex, destinationLineIndex);
  const end = Math.max(selectedLineIndex, destinationLineIndex);
  let segment = lines.slice(start + 1, end);
  if (selectedLineIndex > destinationLineIndex) {
    segment = [...segment].reverse();
  }
  return segment.filter((l) => l.id !== selectedLine.id);
};

// 同じ会社の連続する路線を「〇〇線」にまとめて表示する
// 全路線が同一会社の場合はまとめずに個別表示する
const formatLineNames = (lines: Line[], ja: boolean): string => {
  const names = (l: Line) => (ja ? l.nameShort : l.nameRoman);
  const sep = ja ? '・' : ', ';

  // 全路線が同一会社ならグルーピングせず個別表示
  const allSameCompany =
    lines.length > 1 &&
    lines[0]?.company?.id != null &&
    lines.every((l) => l.company?.id === lines[0]?.company?.id);

  if (allSameCompany) {
    return Array.from(new Set(lines.map(names)))
      .filter(Boolean)
      .join(sep);
  }

  // 連続する同一会社の路線をサブグループ化（companyがない場合はまとめない）
  const companyGroups = lines.reduce<Line[][]>((groups, l) => {
    const lastGroup = groups.at(-1);
    if (
      lastGroup &&
      lastGroup[0]?.company?.id != null &&
      lastGroup[0].company.id === l.company?.id
    ) {
      lastGroup.push(l);
    } else {
      groups.push([l]);
    }
    return groups;
  }, []);

  return companyGroups
    .map((group) => {
      if (group.length > 1) {
        const companyName = ja
          ? group[0]?.company?.nameShort
          : group[0]?.company?.nameEnglishShort;
        return ja ? `${companyName}線` : `${companyName} Line`;
      }
      return names(group[0]);
    })
    .filter(Boolean)
    .join(sep);
};

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
      if (!line) return null;

      const lines = uniqBy(item.lines ?? [], 'id');
      const viaLines = getViaLines(lines, line, destination);

      const title = `${isJapanese ? item.name : item.nameRoman}`;

      // 種別が変わる箇所で改行して区切る
      const groupedViaLines = viaLines.reduce<Line[][]>((groups, l) => {
        const lastGroup = groups[groups.length - 1];
        if (
          lastGroup &&
          lastGroup[0]?.trainType?.typeId === l.trainType?.typeId
        ) {
          lastGroup.push(l);
        } else {
          groups.push([l]);
        }
        return groups;
      }, []);

      const isSingleGroup = groupedViaLines.length <= 1;
      const ja = isJapanese;

      const subtitle = isSingleGroup
        ? ja
          ? `${formatLineNames(viaLines, ja)}${viaLines.length ? ' 直通' : ''}`
          : viaLines.length
            ? `Via ${formatLineNames(viaLines, ja)}`
            : ''
        : groupedViaLines
            .map((group) => {
              const names = formatLineNames(group, ja);
              const typeName = ja
                ? (group[0]?.trainType?.name ?? '')
                : (group[0]?.trainType?.nameRoman ?? '');
              return typeName ? `${names} ${typeName}` : names;
            })
            .join('\n');

      return (
        <CommonCard
          targetStation={line.station ?? undefined}
          line={line}
          title={title}
          subtitle={subtitle}
          loading={loading}
          onPress={() => onSelect(item)}
        />
      );
    },
    [destination, line, loading, onSelect]
  );

  const keyExtractor = useCallback(
    (tt: TrainType, index: number) => tt.id?.toString() ?? index.toString(),
    []
  );

  const trainTypes = useMemo(() => {
    if (!line) return [];

    const trainTypes = fetchedTrainTypes
      .map((tt) => {
        const nestedTrainType = tt.lines?.find((l) => l.id === line.id)
          ?.trainType as TrainType | undefined;
        return { ...tt, ...nestedTrainType, id: tt.id };
      })
      .filter((tt): tt is TrainType => {
        if (!tt || !tt.line) return false;

        const lines = uniqBy(tt.lines ?? [], 'id');
        const selectedLineIndex = lines.findIndex((l) => l.id === line.id);
        if (selectedLineIndex === -1) return false;

        if (destination) {
          const destinationLineIndex = lines.findIndex(
            (l) => l.id === destination.line?.id
          );
          if (destinationLineIndex === -1) return false;
        }

        return true;
      });

    return trainTypes;
  }, [fetchedTrainTypes, line, destination]);

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
