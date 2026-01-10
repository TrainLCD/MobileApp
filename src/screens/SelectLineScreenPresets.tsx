import React, { useCallback, useMemo, useRef } from 'react';
import {
  FlatList,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { NoPresetsCard } from '~/components/NoPresetsCard';
import { PresetCard } from '~/components/PresetCard';
import isTablet from '~/utils/isTablet';
import type { LoopItem } from '../store/atoms/navigation';

type Props = {
  carouselData: LoopItem[];
  isPresetsLoading: boolean;
  onPress: (item: LoopItem) => void;
};

const CARD_GAP = 12;

const CARD_HEIGHT = isTablet ? 180 : 156;
const VERTICAL_PADDING = isTablet ? 8 : 4;
const HORIZONTAL_PADDING = 24;

const styles = StyleSheet.create({
  root: {
    marginHorizontal: -24,
    marginTop: -16,
    marginBottom: 32,
    height: CARD_HEIGHT + VERTICAL_PADDING * 2,
  },
  horizontalMargin: { marginHorizontal: 24 },
  itemSeparator: { width: CARD_GAP },
  contentContainer: {
    paddingVertical: VERTICAL_PADDING,
  },
});

const ItemSeparator = React.memo(() => <View style={styles.itemSeparator} />);

export const SelectLineScreenPresets = ({
  carouselData,
  isPresetsLoading,
  onPress,
}: Props) => {
  const carouselOffsetRef = useRef(0);
  // 現在の"論理インデックス"（carouselData基準）を保持して、再描画でも位置を維持
  const currentLogicalIndexRef = useRef(0);
  const listRef = useRef<FlatList<LoopItem>>(null);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isLandscape = screenWidth > screenHeight;

  // タブレットでは縦向き2分割、横向き3分割のカード幅
  const numCardsVisible = isTablet ? (isLandscape ? 3 : 2) : 1;
  const cardWidth = isTablet
    ? (screenWidth -
        HORIZONTAL_PADDING * 2 -
        CARD_GAP * (numCardsVisible - 1)) /
      numCardsVisible
    : screenWidth;

  // プリセットが2件以上の場合のみループ用に3倍にする
  const shouldLoop = carouselData.length >= 2;
  const loopData = useMemo(
    () =>
      carouselData.length
        ? shouldLoop
          ? [
              ...carouselData.map((r, i) => ({ ...r, __k: `${r.id}-a-${i}` })),
              ...carouselData.map((r, i) => ({ ...r, __k: `${r.id}-b-${i}` })),
              ...carouselData.map((r, i) => ({ ...r, __k: `${r.id}-c-${i}` })),
            ]
          : carouselData.map((r, i) => ({ ...r, __k: `${r.id}-${i}` }))
        : [],
    [carouselData, shouldLoop]
  );

  const ITEM_SIZE = cardWidth + CARD_GAP;

  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!carouselData.length || !shouldLoop) return;
      const x = e.nativeEvent.contentOffset.x;
      const rawIndex = Math.round(x / ITEM_SIZE);
      // 論理インデックス（0..length-1）を保存しておく
      const logicalIndex =
        ((rawIndex % carouselData.length) + carouselData.length) %
        carouselData.length;
      currentLogicalIndexRef.current = logicalIndex;
      // ループのため、先頭ブロックに来たら1ブロック先へ、末尾ブロックなら1ブロック戻す
      if (rawIndex < carouselData.length) {
        const newOffset = (rawIndex + carouselData.length) * ITEM_SIZE;
        carouselOffsetRef.current = newOffset;
        listRef.current?.scrollToOffset({ offset: newOffset, animated: false });
      } else if (rawIndex >= carouselData.length * 2) {
        const newOffset = (rawIndex - carouselData.length) * ITEM_SIZE;
        carouselOffsetRef.current = newOffset;
        listRef.current?.scrollToOffset({ offset: newOffset, animated: false });
      }
    },
    [ITEM_SIZE, carouselData.length, shouldLoop]
  );

  const snapOffsets = useMemo(
    () => loopData.map((_, i) => i * ITEM_SIZE),
    [loopData, ITEM_SIZE]
  );

  const keyExtractor = useCallback((item: LoopItem) => item.__k, []);

  const renderItem: ListRenderItem<LoopItem> = useCallback(
    ({ item }) =>
      isTablet ? (
        <View style={{ width: cardWidth }}>
          <Pressable onPress={() => item.stations.length > 0 && onPress(item)}>
            <PresetCard
              title={item.name}
              from={item.stations[0]}
              to={item.stations.at(-1)}
            />
          </Pressable>
        </View>
      ) : (
        <View style={{ width: cardWidth }}>
          <View style={styles.horizontalMargin}>
            <Pressable
              onPress={() => item.stations.length > 0 && onPress(item)}
            >
              <PresetCard
                title={item.name}
                from={item.stations[0]}
                to={item.stations.at(-1)}
              />
            </Pressable>
          </View>
        </View>
      ),
    [cardWidth, onPress]
  );

  const listEmptyComponent = useMemo(
    () =>
      isPresetsLoading ? (
        <View style={{ width: cardWidth }}>
          <View style={isTablet ? undefined : styles.horizontalMargin}>
            <SkeletonPlaceholder borderRadius={isTablet ? 8 : 4} speed={1500}>
              <SkeletonPlaceholder.Item
                width={isTablet ? cardWidth : cardWidth - 48}
                height={CARD_HEIGHT}
              />
            </SkeletonPlaceholder>
          </View>
        </View>
      ) : (
        <View
          style={{
            width: cardWidth,
          }}
        >
          <View style={isTablet ? undefined : styles.horizontalMargin}>
            <NoPresetsCard />
          </View>
        </View>
      ),
    [isPresetsLoading, cardWidth]
  );

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!carouselData.length) return;
      const x = e.nativeEvent.contentOffset.x;
      carouselOffsetRef.current = x;
      const rawIndex = Math.round(x / ITEM_SIZE);
      const logicalIndex =
        ((rawIndex % carouselData.length) + carouselData.length) %
        carouselData.length;
      currentLogicalIndexRef.current = logicalIndex;
    },
    [ITEM_SIZE, carouselData.length]
  );

  return (
    <View style={styles.root}>
      <FlatList<LoopItem>
        ref={listRef}
        horizontal
        data={loopData}
        keyExtractor={keyExtractor}
        ListEmptyComponent={listEmptyComponent}
        renderItem={renderItem}
        ItemSeparatorComponent={ItemSeparator}
        showsHorizontalScrollIndicator={false}
        snapToOffsets={snapOffsets}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumEnd}
        decelerationRate="fast"
        snapToAlignment="start"
        disableIntervalMomentum
        style={{ height: CARD_HEIGHT }}
        contentContainerStyle={[
          styles.contentContainer,
          isTablet && { paddingHorizontal: HORIZONTAL_PADDING },
          carouselData.length <= 1 && { flexGrow: 1, justifyContent: 'center' },
        ]}
      />
    </View>
  );
};
