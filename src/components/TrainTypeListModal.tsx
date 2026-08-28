import { FlashList } from '@shopify/flash-list';
import { BlurView } from 'expo-blur';
import { useAtomValue } from 'jotai';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  type LayoutChangeEvent,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import type { Line, Station, TrainType } from '~/@types/graphql';
import { LED_THEME_BG_COLOR } from '~/constants/color';
import { appColorsAtom } from '~/store/atoms/colorScheme';
import { fetchedTrainTypesAtom } from '~/store/atoms/navigation';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { isJapanese, translate } from '~/translation';
import isTablet from '~/utils/isTablet';
import { RFValue } from '~/utils/rfValue';
import {
  buildTrainTypeFilterOptions,
  EMPTY_TRAIN_TYPE_FILTER,
  filterTrainTypeRows,
  isTrainTypeFilterActive,
  type TrainTypeFilterState,
} from '~/utils/trainTypeFilter';
import { buildTrainTypeRow, type TrainTypeRow } from '~/utils/trainTypeList';
import Button from './Button';
import { CommonCard } from './CommonCard';
import { CustomModal } from './CustomModal';
import { EmptyLineSeparator } from './EmptyLineSeparator';
import { Heading } from './Heading';
import { TrainTypeFilterBar } from './TrainTypeFilterBar';
import Typography from './Typography';

/** ヘッダー・フッターの高さ（リストはこの下に潜って描画される） */
const HEADER_HEIGHT = 72;
/**
 * 絞り込みを出す件数のしきい値。
 * 数件しかない駅では絞り込む相手がおらず、ヘッダーがリストを圧迫するだけになる。
 */
const FILTER_MIN_TRAIN_TYPE_COUNT = 6;
/**
 * 絞り込みを出したときのヘッダー高さの見積り（見出し + 検索欄 + チップ行）。
 * モーダル自体の高さはこの固定値で決め、実測値はリストの余白だけに使う。
 * 実測値で高さを決めるとパネルの開閉のたびにモーダルが伸縮してしまうため。
 */
const FILTER_HEADER_HEIGHT = 160;
/** モーダルを画面端から離すための余白（containerStyle の padding と揃える） */
const MODAL_CONTAINER_PADDING = 24;

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
    height: HEADER_HEIGHT,
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
    zIndex: 1,
    paddingHorizontal: 24,
  },
  headerContainerFixed: {
    height: HEADER_HEIGHT,
    justifyContent: 'center',
  },
  headerContainerWithFilter: {
    paddingTop: 21,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitles: {
    flex: 1,
  },
  countText: {
    fontSize: 12,
    fontWeight: 'bold',
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
  },
  emptyContainer: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
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
  const colors = useAtomValue(appColorsAtom);

  const [filter, setFilter] = useState<TrainTypeFilterState>(
    EMPTY_TRAIN_TYPE_FILTER
  );
  const [measuredHeaderHeight, setMeasuredHeaderHeight] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

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

  const trainTypes = useMemo(() => {
    if (!line) return [];

    // 種別名は選択路線上の表記に合わせたいので、選択路線にぶら下がる種別をマージする
    return fetchedTrainTypes.map((tt) => {
      const nestedTrainType = tt.lines?.find((l) => l.id === line.id)
        ?.trainType as TrainType | undefined;
      return { ...tt, ...nestedTrainType, id: tt.id };
    });
  }, [fetchedTrainTypes, line]);

  // 表示用の値と絞り込み用の値は同じ経由路線から導けるので、行ごとに一度だけ組み立てる
  const rows = useMemo(
    () =>
      line
        ? trainTypes.map((tt) =>
            buildTrainTypeRow(
              tt,
              line,
              boardingStation,
              destination,
              isJapanese
            )
          )
        : [],
    [trainTypes, line, boardingStation, destination]
  );

  const filterEnabled = rows.length >= FILTER_MIN_TRAIN_TYPE_COUNT;
  const filterActive = filterEnabled && isTrainTypeFilterActive(filter);

  const filterOptions = useMemo(
    () => buildTrainTypeFilterOptions(rows, isJapanese),
    [rows]
  );

  const visibleRows = useMemo(
    () => (filterEnabled ? filterTrainTypeRows(rows, filter) : rows),
    [filterEnabled, rows, filter]
  );

  // 閉じたら条件を捨てる。次に開いたときに前回の絞り込みが残っていると、
  // 種別そのものが減ったように見えてしまう
  useEffect(() => {
    if (!visible) {
      setFilter(EMPTY_TRAIN_TYPE_FILTER);
    }
  }, [visible]);

  const handleClearFilter = useCallback(
    () => setFilter(EMPTY_TRAIN_TYPE_FILTER),
    []
  );

  // 絞り込みは入力しながら結果を見る操作なので、キーボードにモーダルが隠れると
  // 成立しない。edgeToEdgeEnabled=true では adjustResize でウィンドウが縮まず、
  // KeyboardAvoidingView の padding も百分率の maxHeight を詰めてくれないため、
  // せり上がってくる高さを実測してモーダルの高さと位置を自前で決める
  useEffect(() => {
    if (!visible || !filterEnabled) {
      setKeyboardHeight(0);
      return;
    }

    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [visible, filterEnabled]);

  const handleHeaderLayout = useCallback(
    (e: LayoutChangeEvent) =>
      setMeasuredHeaderHeight(e.nativeEvent.layout.height),
    []
  );

  const headerHeight = filterEnabled
    ? measuredHeaderHeight || FILTER_HEADER_HEIGHT
    : HEADER_HEIGHT;

  const countText = useMemo(() => {
    if (!filterEnabled) {
      return '';
    }
    return filterActive
      ? translate('trainTypeFilterCount', {
          count: visibleRows.length,
          total: rows.length,
        })
      : translate('trainTypeCount', { count: rows.length });
  }, [filterEnabled, filterActive, visibleRows.length, rows.length]);

  const renderItem = useCallback(
    ({ item }: { item: TrainTypeRow }) => (
      <CommonCard
        targetStation={item.cardLineStation ?? undefined}
        line={item.cardLine}
        title={item.title}
        subtitle={item.subtitle}
        loading={loading}
        onPress={() => onSelect(item.trainType)}
      />
    ),
    [loading, onSelect]
  );

  const keyExtractor = useCallback(
    (row: TrainTypeRow, index: number) =>
      row.trainType.id?.toString() ?? index.toString(),
    []
  );

  const listEmptyComponent = useMemo(() => {
    if (loading) {
      return (
        <SkeletonPlaceholder borderRadius={4} speed={1500}>
          <SkeletonPlaceholder.Item width="100%" height={72} />
        </SkeletonPlaceholder>
      );
    }

    if (!filterActive) {
      return null;
    }

    return (
      <View style={styles.emptyContainer}>
        <Typography style={styles.emptyText}>
          {translate('trainTypeListEmpty')}
        </Typography>
        <Button outline onPress={handleClearFilter}>
          {translate('trainTypeFilterClearAll')}
        </Button>
      </View>
    );
  }, [loading, filterActive, handleClearFilter]);

  // ヘッダー + アイテム(80*件数) + セパレーター(8*(件数-1)) + フッター
  // 絞り込み中も高さは変えたくないので、件数は常に絞り込み前のものを使う
  const dynamicMinHeight = useMemo(() => {
    const baseHeaderHeight = filterEnabled
      ? FILTER_HEADER_HEIGHT
      : HEADER_HEIGHT;
    const content =
      baseHeaderHeight +
      rows.length * 80 +
      Math.max(0, rows.length - 1) * 8 +
      HEADER_HEIGHT;
    // キーボードが出ている間だけ、残った可視領域に収まる高さまで詰める
    const limit = keyboardHeight
      ? windowHeight - keyboardHeight - MODAL_CONTAINER_PADDING * 2
      : windowHeight * 0.75;
    return Math.min(content, limit);
  }, [filterEnabled, rows.length, windowHeight, keyboardHeight]);

  const listContentContainerStyle = useMemo(
    () => [
      styles.flatListContentContainer,
      { paddingTop: headerHeight, paddingBottom: HEADER_HEIGHT },
    ],
    [headerHeight]
  );

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      backdropStyle={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      containerStyle={[
        styles.root,
        // 空いた領域の中央に置き直す。これでモーダルがキーボードの上に収まる
        keyboardHeight > 0 && {
          paddingBottom: MODAL_CONTAINER_PADDING + keyboardHeight,
        },
      ]}
      contentContainerStyle={[
        styles.contentView,
        {
          height: dynamicMinHeight,
          backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : colors.card,
        },
        isTablet && {
          width: '80%',
          maxHeight: '75%',
          borderRadius: 16,
        },
        // 既定の maxHeight('75%') は画面全体に対する割合なので、キーボードで
        // 縮んだ領域に対しても 75% までしか使えずリストが 1 枚分しか残らない。
        // 高さは上で可視領域に収まる値まで詰めてあるので、ここは解放してよい
        keyboardHeight > 0 && { maxHeight: '100%' as const },
      ]}
    >
      <View
        onLayout={filterEnabled ? handleHeaderLayout : undefined}
        style={[
          styles.headerContainer,
          filterEnabled
            ? styles.headerContainerWithFilter
            : styles.headerContainerFixed,
          { backgroundColor: isLEDTheme ? '#212121' : undefined },
        ]}
      >
        {Platform.OS === 'ios' && !isLEDTheme ? (
          <BlurView
            intensity={80}
            tint={colors.blurTint}
            style={StyleSheet.absoluteFill}
          />
        ) : Platform.OS === 'android' && !isLEDTheme ? (
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: colors.modalHeaderBackground },
            ]}
          />
        ) : null}
        <View style={styles.headerTitleRow}>
          <View style={styles.headerTitles}>
            <Heading
              singleLine
              style={[
                destination ? styles.subtitle : styles.title,
                !isLEDTheme && { color: colors.modalHeadingText },
              ]}
            >
              {title}
            </Heading>
            {destination ? (
              <Heading
                style={[
                  styles.title,
                  !isLEDTheme && { color: colors.modalHeadingText },
                ]}
              >
                {subtitle}
              </Heading>
            ) : null}
          </View>
          {filterEnabled ? (
            <Typography
              style={[
                styles.countText,
                { color: isLEDTheme ? '#fff' : colors.secondaryText },
              ]}
            >
              {countText}
            </Typography>
          ) : null}
        </View>
        {filterEnabled ? (
          <TrainTypeFilterBar
            options={filterOptions}
            filter={filter}
            onChange={setFilter}
          />
        ) : null}
      </View>

      <FlashList<TrainTypeRow>
        style={StyleSheet.absoluteFill}
        data={visibleRows}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ItemSeparatorComponent={EmptyLineSeparator}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={listContentContainerStyle}
        scrollIndicatorInsets={{ top: headerHeight, bottom: HEADER_HEIGHT }}
        ListEmptyComponent={listEmptyComponent}
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
            tint={colors.blurTint}
            style={StyleSheet.absoluteFill}
          />
        ) : Platform.OS === 'android' && !isLEDTheme ? (
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: colors.modalHeaderBackground },
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
