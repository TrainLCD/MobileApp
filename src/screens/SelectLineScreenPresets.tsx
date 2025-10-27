import { useCallback, useMemo, useRef } from 'react';
import {
  FlatList,
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
import type { LoopItem } from '../store/atoms/navigation';

type Props = {
  carouselData: LoopItem[];
  isPresetsLoading: boolean;
  onPress: (item: LoopItem) => void;
};

const CARD_GAP = 12;

const styles = StyleSheet.create({
  root: { marginHorizontal: -24 },
  horizontalMargin: { marginHorizontal: 24 },
  noPresetsContainer: { height: 160, justifyContent: 'center' },
  itemSeparator: { width: CARD_GAP },
  contentContainer: { paddingHorizontal: 0, marginBottom: 48 },
});

export const SelectLineScreenPresets = ({
  carouselData,
  isPresetsLoading,
  onPress,
}: Props) => {
  const carouselOffsetRef = useRef(0);
  // 現在の“論理インデックス”（carouselData基準）を保持して、再描画でも位置を維持
  const currentLogicalIndexRef = useRef(0);
  const listRef = useRef<FlatList<LoopItem>>(null);
  const loopData = useMemo(
    () =>
      carouselData.length
        ? [
            ...carouselData.map((r, i) => ({ ...r, __k: `${r.id}-a-${i}` })),
            ...carouselData.map((r, i) => ({ ...r, __k: `${r.id}-b-${i}` })),
            ...carouselData.map((r, i) => ({ ...r, __k: `${r.id}-c-${i}` })),
          ]
        : [],
    [carouselData]
  );
  const cardWidth = useWindowDimensions().width; // アイテム幅は画面幅いっぱい
  const sidePadding = 0;

  const ITEM_SIZE = cardWidth + CARD_GAP;

  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!carouselData.length) return;
      const x = e.nativeEvent.contentOffset.x;
      const rawIndex = Math.round((x - sidePadding) / ITEM_SIZE);
      // 論理インデックス（0..length-1）を保存しておく
      const logicalIndex =
        ((rawIndex % carouselData.length) + carouselData.length) %
        carouselData.length;
      currentLogicalIndexRef.current = logicalIndex;
      // ループのため、先頭ブロックに来たら1ブロック先へ、末尾ブロックなら1ブロック戻す
      if (rawIndex < carouselData.length) {
        const newOffset =
          sidePadding + (rawIndex + carouselData.length) * ITEM_SIZE;
        carouselOffsetRef.current = newOffset;
        listRef.current?.scrollToOffset({ offset: newOffset, animated: false });
      } else if (rawIndex >= carouselData.length * 2) {
        const newOffset =
          sidePadding + (rawIndex - carouselData.length) * ITEM_SIZE;
        carouselOffsetRef.current = newOffset;
        listRef.current?.scrollToOffset({ offset: newOffset, animated: false });
      }
    },
    [ITEM_SIZE, carouselData.length]
  );

  const snapOffsets = useMemo(
    () => loopData.map((_, i) => i * ITEM_SIZE),
    [loopData, ITEM_SIZE]
  );

  return (
    <View style={styles.root}>
      <FlatList<LoopItem>
        ref={listRef}
        horizontal
        data={loopData}
        keyExtractor={(item) => item.__k}
        ListEmptyComponent={() =>
          isPresetsLoading ? (
            <SkeletonPlaceholder borderRadius={4} speed={1500}>
              <SkeletonPlaceholder.Item
                width={cardWidth - 48}
                height={160}
                style={styles.horizontalMargin}
              />
            </SkeletonPlaceholder>
          ) : (
            <View
              style={[
                styles.noPresetsContainer,
                {
                  width: cardWidth,
                },
              ]}
            >
              <View style={styles.horizontalMargin}>
                <NoPresetsCard />
              </View>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={{ width: cardWidth }}>
            <View style={styles.horizontalMargin}>
              <Pressable
                onPress={() => item.stations.length > 0 && onPress(item)}
              >
                <PresetCard
                  title={item.name}
                  from={item.stations[0]}
                  to={item.stations[item.stations.length - 1]}
                />
              </Pressable>
            </View>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
        showsHorizontalScrollIndicator={false}
        snapToOffsets={snapOffsets}
        onScroll={(e) => {
          if (!carouselData.length) return;
          const x = e.nativeEvent.contentOffset.x;
          carouselOffsetRef.current = x;
          const rawIndex = Math.round((x - sidePadding) / ITEM_SIZE);
          const logicalIndex =
            ((rawIndex % carouselData.length) + carouselData.length) %
            carouselData.length;
          currentLogicalIndexRef.current = logicalIndex;
        }}
        onMomentumScrollEnd={handleMomentumEnd}
        decelerationRate="fast"
        snapToAlignment="start"
        disableIntervalMomentum
        contentContainerStyle={styles.contentContainer}
      />
    </View>
  );
};
