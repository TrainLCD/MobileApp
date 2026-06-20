import { FlashList } from '@shopify/flash-list';
import { BlurView } from 'expo-blur';
import { useAtomValue } from 'jotai';
import uniqBy from 'lodash/uniqBy';
import { useCallback, useMemo } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import type { Line, Station, TrainType } from '~/@types/graphql';
import { LED_THEME_BG_COLOR } from '~/constants/color';
import { fetchedTrainTypesAtom } from '~/store/atoms/navigation';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { isJapanese, translate } from '~/translation';
import isTablet from '~/utils/isTablet';
import { RFValue } from '~/utils/rfValue';
import {
  formatLineNames,
  getBoardingLine,
  getBoardingLineStation,
  getViaLines,
} from '~/utils/trainTypeList';
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
  headerText: {
    color: '#111',
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
  /**
   * 乗車駅。起点路線ごとの駅番号（ナンバリング）を引くために使う。
   * 経路検索の item.lines[].station は API が null を返すため、乗車駅の
   * 路線別 station からナンバリングを解決する。
   */
  boardingStation?: Station | null;
  loading?: boolean;
  onClose: () => void;
  onSelect: (trainType: TrainType) => void;
};

export const TrainTypeListModal = ({
  visible,
  line,
  destination,
  boardingStation,
  loading,
  onClose,
  onSelect,
}: Props) => {
  const fetchedTrainTypes = useAtomValue(fetchedTrainTypesAtom);
  const { height: windowHeight } = useWindowDimensions();
  const isLEDTheme = useAtomValue(isLEDThemeAtom);

  const title = useMemo(() => {
    // 行先がある経路検索では行先の路線名を、無い場合は選択路線名を表示する
    const headerLine = destination?.line ?? line;
    return (isJapanese ? headerLine?.nameShort : headerLine?.nameRoman) ?? '';
  }, [destination?.line, line]);
  const subtitle = useMemo(() => {
    if (!destination) {
      return '';
    }

    return isJapanese
      ? `${destination.name ?? ''}方面`
      : `${destination.nameRoman ?? ''}`;
  }, [destination]);

  const renderItem = useCallback(
    ({ item }: { item: TrainType }) => {
      if (!line) return null;

      const lines = uniqBy(item.lines ?? [], 'id');

      // カードの配色・路線シンボル・ナンバリングは、種別ごとに乗車駅で実際に乗車する
      // 路線で統一する（選択中の line で固定すると東武東上線経由の種別に西武池袋線の
      // デザインが当たってしまう）。経路の途中駅から乗る場合は終端路線ではなく乗車路線
      // を使うことで、乗車駅に必ず存在する駅番号でナンバリングを安定表示できる。
      const boardingLine = getBoardingLine(
        lines,
        boardingStation,
        line,
        destination
      );

      const viaLines = getViaLines(lines, boardingLine, destination);

      const title = `${isJapanese ? item.name : item.nameRoman}`;

      // 同じ種別の路線をグループ化（連続していなくても同じtypeIdなら同一グループ）
      const groupedViaLines = viaLines.reduce<Line[][]>((groups, l) => {
        const typeId = l.trainType?.typeId;
        const existingGroup =
          typeId !== null && typeId !== undefined
            ? groups.find((g) => g[0]?.trainType?.typeId === typeId)
            : undefined;
        if (existingGroup) {
          existingGroup.push(l);
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

      // 駅番号（ナンバリング）は乗車路線の乗車駅基準で表示する。乗車路線はカードの
      // デザインと同一なので CommonCard の路線記号一致が必ず成立し、番号が安定して
      // 描画される。
      const boardingLineStation = getBoardingLineStation(
        boardingStation,
        boardingLine,
        line
      );

      return (
        <CommonCard
          targetStation={boardingLineStation ?? undefined}
          line={boardingLine}
          title={title}
          subtitle={subtitle}
          loading={loading}
          onPress={() => onSelect(item)}
        />
      );
    },
    [boardingStation, destination, line, loading, onSelect]
  );

  const keyExtractor = useCallback(
    (tt: TrainType, index: number) => tt.id?.toString() ?? index.toString(),
    []
  );

  const trainTypes = useMemo(() => {
    if (!line) return [];

    // 種別名は選択路線上の表記に合わせたいので、選択路線にぶら下がる種別をマージする
    return fetchedTrainTypes.map((tt) => {
      const nestedTrainType = tt.lines?.find((l) => l.id === line.id)
        ?.trainType as TrainType | undefined;
      return { ...tt, ...nestedTrainType, id: tt.id };
    });
  }, [fetchedTrainTypes, line]);

  // ヘッダー(72) + アイテム(80*件数) + セパレーター(8*(件数-1)) + フッター(72)
  const dynamicMinHeight = useMemo(() => {
    const content =
      72 + trainTypes.length * 80 + Math.max(0, trainTypes.length - 1) * 8 + 72;
    return Math.min(content, windowHeight * 0.75);
  }, [trainTypes.length, windowHeight]);

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      backdropStyle={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      containerStyle={styles.root}
      contentContainerStyle={[
        styles.contentView,
        {
          height: dynamicMinHeight,
          backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : '#fff',
        },
        isTablet && {
          width: '80%',
          maxHeight: '75%',
          borderRadius: 16,
        },
      ]}
    >
      <View
        style={[
          styles.headerContainer,
          { backgroundColor: isLEDTheme ? '#212121' : undefined },
        ]}
      >
        {Platform.OS === 'ios' && !isLEDTheme ? (
          <BlurView
            intensity={80}
            tint="light"
            style={StyleSheet.absoluteFill}
          />
        ) : Platform.OS === 'android' && !isLEDTheme ? (
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: 'rgba(255,255,255,0.92)' },
            ]}
          />
        ) : null}
        <Heading
          singleLine
          style={[
            destination ? styles.subtitle : styles.title,
            !isLEDTheme && styles.headerText,
          ]}
        >
          {title}
        </Heading>
        {destination ? (
          <Heading style={[styles.title, !isLEDTheme && styles.headerText]}>
            {subtitle}
          </Heading>
        ) : null}
      </View>

      <FlashList<TrainType>
        style={StyleSheet.absoluteFill}
        data={trainTypes}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ItemSeparatorComponent={EmptyLineSeparator}
        scrollEventThrottle={16}
        contentContainerStyle={styles.flatListContentContainer}
        scrollIndicatorInsets={{ top: 72, bottom: 72 }}
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
          { backgroundColor: isLEDTheme ? '#212121' : undefined },
        ]}
      >
        {Platform.OS === 'ios' && !isLEDTheme ? (
          <BlurView
            intensity={80}
            tint="light"
            style={StyleSheet.absoluteFill}
          />
        ) : Platform.OS === 'android' && !isLEDTheme ? (
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: 'rgba(255,255,255,0.92)' },
            ]}
          />
        ) : null}
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
