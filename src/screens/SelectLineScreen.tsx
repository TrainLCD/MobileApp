import * as ScreenOrientation from 'expo-screen-orientation';
import { Orientation } from 'expo-screen-orientation';
import { useAtomValue } from 'jotai';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import Animated, {
  LinearTransition,
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import type { Line, LineNested } from '~/@types/graphql';
import { CommonCard } from '~/components/CommonCard';
import { EmptyLineSeparator } from '~/components/EmptyLineSeparator';
import { NowHeader } from '~/components/NowHeader';
import { SelectBoundModal } from '~/components/SelectBoundModal';
import WalkthroughOverlay from '~/components/WalkthroughOverlay';
import { useDeviceOrientation } from '~/hooks/useDeviceOrientation';
import { useInitialNearbyStation } from '~/hooks/useInitialNearbyStation';
import { useLineSelection } from '~/hooks/useLineSelection';
import { usePresetCarouselData } from '~/hooks/usePresetCarouselData';
import { useSelectLineWalkthrough } from '~/hooks/useSelectLineWalkthrough';
import { useStationsCache } from '~/hooks/useStationsCache';
import isTablet from '~/utils/isTablet';
import { isBusLine } from '~/utils/line';
import FooterTabBar, { FOOTER_BASE_HEIGHT } from '../components/FooterTabBar';
import { Heading } from '../components/Heading';
import stationState from '../store/atoms/station';
import { isLEDThemeAtom } from '../store/atoms/theme';
import { isJapanese, translate } from '../translation';
import { generateLineTestId } from '../utils/generateTestID';
import { SelectLineScreenPresets } from './SelectLineScreenPresets';

const styles = StyleSheet.create({
  root: { paddingHorizontal: 24, flex: 1 },
  listContainerStyle: {
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  busHeading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 32,
    marginBottom: 16,
  },
  screenBg: {
    backgroundColor: '#FAFAFA',
  },
});

// RN 0.81 + New Architecture で tintColor がマウント時に無視されるバグの回避用遅延(ms)
// https://github.com/facebook/react-native/issues/53987
const REFRESH_TINT_DELAY_MS = 500;

const NearbyStationLoader = () => (
  <SkeletonPlaceholder borderRadius={4} speed={1500}>
    <SkeletonPlaceholder.Item width="100%" height={72} />
  </SkeletonPlaceholder>
);

const SelectLineScreen = () => {
  const [nowHeaderHeight, setNowHeaderHeight] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // --- カスタムフック ---
  const { station, nearbyStationLoading, refetch } = useInitialNearbyStation();
  useStationsCache(station);
  const { carouselData, isRoutesDBInitialized } = usePresetCarouselData();
  const {
    handleLineSelected,
    handleTrainTypeSelect,
    handlePresetPress,
    handleCloseSelectBoundModal,
    isSelectBoundModalOpen,
    fetchTrainTypesLoading,
    fetchStationsByLineIdLoading,
    fetchStationsByLineGroupIdLoading,
    fetchTrainTypesError,
    fetchStationsByLineIdError,
    fetchStationsByLineGroupIdError,
  } = useLineSelection();
  const {
    isWalkthroughActive,
    currentStepIndex,
    currentStep,
    totalSteps,
    nextStep,
    goToStep,
    skipWalkthrough,
    setSettingsButtonLayout,
    setNowHeaderLayout,
    lineListRef,
    presetsRef,
    handlePresetsLayout,
    handleLineListLayout,
  } = useSelectLineWalkthrough();

  // --- atom 読み取り ---
  const { stationsCache } = useAtomValue(stationState);
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);

  // --- 画面回転ロック解除 ---
  useEffect(() => {
    ScreenOrientation.unlockAsync().catch(console.error);
  }, []);

  // --- RefreshControl tintColor ワークアラウンド ---
  const [refreshTintColor, setRefreshTintColor] = useState<
    string | undefined
  >();
  useEffect(() => {
    const timer = setTimeout(() => {
      setRefreshTintColor(isLEDTheme ? '#fff' : undefined);
    }, REFRESH_TINT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isLEDTheme]);

  // --- 派生値 ---
  const footerHeight = FOOTER_BASE_HEIGHT + Math.max(insets.bottom, 8);
  const listPaddingBottom = useMemo(() => {
    const flattened = StyleSheet.flatten(styles.listContainerStyle) as {
      paddingBottom?: number;
    };
    return (flattened?.paddingBottom ?? 24) + footerHeight;
  }, [footerHeight]);

  const orientation = useDeviceOrientation();
  const isPortraitOrientation = useMemo(
    () =>
      orientation === Orientation.PORTRAIT_UP ||
      orientation === Orientation.PORTRAIT_DOWN,
    [orientation]
  );
  const numColumns = useMemo(
    () => (isTablet ? (isPortraitOrientation ? 2 : 3) : 1),
    [isPortraitOrientation]
  );

  const stationLines = useMemo<Line[]>(() => {
    return (station?.lines ?? []).filter(
      (line): line is LineNested => line?.id != null && !isBusLine(line)
    );
  }, [station?.lines]);
  const busesLines = useMemo<Line[]>(() => {
    return (station?.lines ?? []).filter(
      (line): line is LineNested => line?.id != null && isBusLine(line)
    );
  }, [station?.lines]);

  const headingTitleForRailway = useMemo(() => {
    if (!station) return translate('selectLineTitle');
    const re = /\([^()]*\)/g;
    const baseNameJa = (station.name ?? '').replace(re, '');
    const baseNameEn = (station.nameRoman ?? station.name ?? '').replace(
      re,
      ''
    );
    return translate('linesNearbyAtStation', {
      stationName: isJapanese ? baseNameJa : baseNameEn,
    });
  }, [station]);

  const isPresetsLoading = useMemo(
    () =>
      !isRoutesDBInitialized ||
      fetchStationsByLineIdLoading ||
      fetchStationsByLineGroupIdLoading,
    [
      isRoutesDBInitialized,
      fetchStationsByLineIdLoading,
      fetchStationsByLineGroupIdLoading,
    ]
  );

  // --- スクロールハンドラ ---
  const handleScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  // --- レンダーコールバック ---
  const renderLineCard = useCallback(
    (line: Line, index: number) => {
      if (fetchStationsByLineIdLoading) {
        return (
          <SkeletonPlaceholder borderRadius={4} speed={1500}>
            <SkeletonPlaceholder.Item width="100%" height={72} />
          </SkeletonPlaceholder>
        );
      }

      return (
        <CommonCard
          targetStation={line.station ?? undefined}
          line={line}
          onPress={() => handleLineSelected(line)}
          stations={stationsCache[index] ?? []}
          loading={!stationsCache[index]}
          testID={generateLineTestId(line)}
        />
      );
    },
    [fetchStationsByLineIdLoading, handleLineSelected, stationsCache]
  );

  const renderPlaceholders = useCallback((rowIndex: number, count: number) => {
    if (!isTablet || count <= 0) {
      return null;
    }

    return Array.from({ length: count }).map((_, i) => (
      <Animated.View
        layout={LinearTransition.springify()}
        // biome-ignore lint/suspicious/noArrayIndexKey: プレースホルダーは静的で順序が変わらないため問題なし
        key={`placeholder-${rowIndex}-${i}`}
        style={{ flex: 1 }}
      />
    ));
  }, []);

  const renderLineRow = useCallback(
    (rowLines: Line[], rowIndex: number) => {
      return (
        <>
          {rowIndex > 0 && <EmptyLineSeparator />}
          <Animated.View
            layout={LinearTransition.springify()}
            style={
              isTablet
                ? {
                    flexDirection: 'row',
                    gap: 16,
                  }
                : undefined
            }
          >
            {rowLines.map((line, colIndex) => {
              const index = rowIndex * numColumns + colIndex;
              return (
                <Animated.View
                  layout={LinearTransition.springify()}
                  key={line.id as number}
                  style={isTablet ? { flex: 1 } : undefined}
                >
                  {renderLineCard(line, index)}
                </Animated.View>
              );
            })}
            {renderPlaceholders(rowIndex, numColumns - rowLines.length)}
          </Animated.View>
        </>
      );
    },
    [numColumns, renderLineCard, renderPlaceholders]
  );

  // --- JSX ---
  return (
    <>
      <SafeAreaView style={[styles.root, !isLEDTheme && styles.screenBg]}>
        <Animated.ScrollView
          style={StyleSheet.absoluteFill}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              progressViewOffset={nowHeaderHeight}
              tintColor={refreshTintColor}
              colors={isLEDTheme ? ['#fff'] : undefined}
            />
          }
          contentContainerStyle={[
            styles.listContainerStyle,
            nowHeaderHeight ? { paddingTop: nowHeaderHeight } : null,
            { paddingBottom: listPaddingBottom },
          ]}
        >
          {nearbyStationLoading && !refreshing ? (
            <NearbyStationLoader />
          ) : (
            <>
              <View ref={presetsRef} onLayout={handlePresetsLayout}>
                <SelectLineScreenPresets
                  carouselData={carouselData}
                  isPresetsLoading={isPresetsLoading}
                  onPress={handlePresetPress}
                />
              </View>
              <View ref={lineListRef} onLayout={handleLineListLayout}>
                {stationLines.length > 0 && (
                  <Heading style={styles.heading} singleLine>
                    {headingTitleForRailway}
                  </Heading>
                )}
                {Array.from({
                  length: Math.ceil(stationLines.length / numColumns),
                }).map((_, rowIndex) => {
                  const rowLines = stationLines.slice(
                    rowIndex * numColumns,
                    (rowIndex + 1) * numColumns
                  );
                  const rowKey = rowLines.map((l) => l.id).join('-');
                  return (
                    <React.Fragment key={rowKey}>
                      {renderLineRow(rowLines, rowIndex)}
                    </React.Fragment>
                  );
                })}
              </View>

              {busesLines.length > 0 && (
                <>
                  <Heading style={styles.busHeading} singleLine>
                    {translate('toeiBusStopsNearby')}
                  </Heading>
                  {Array.from({
                    length: Math.ceil(busesLines.length / numColumns),
                  }).map((_, rowIndex) => {
                    const rowLines = busesLines.slice(
                      rowIndex * numColumns,
                      (rowIndex + 1) * numColumns
                    );
                    const rowKey = rowLines.map((l) => l.id).join('-');
                    return (
                      <React.Fragment key={rowKey}>
                        {renderLineRow(
                          rowLines,
                          rowIndex + stationLines.length
                        )}
                      </React.Fragment>
                    );
                  })}
                </>
              )}
            </>
          )}
          <EmptyLineSeparator />
        </Animated.ScrollView>
      </SafeAreaView>

      {/* 固定ヘッダー */}
      <NowHeader
        station={station}
        onLayout={(e) => setNowHeaderHeight(e.nativeEvent.layout.height + 32)}
        onHeaderLayout={setNowHeaderLayout}
        scrollY={scrollY}
      />

      {/* フッター */}
      <FooterTabBar
        active="home"
        onSettingsButtonLayout={setSettingsButtonLayout}
      />
      {/* モーダル */}
      <SelectBoundModal
        visible={isSelectBoundModalOpen}
        onClose={handleCloseSelectBoundModal}
        onBoundSelect={handleCloseSelectBoundModal}
        loading={
          fetchTrainTypesLoading ||
          fetchStationsByLineIdLoading ||
          fetchStationsByLineGroupIdLoading
        }
        error={
          fetchTrainTypesError ??
          fetchStationsByLineIdError ??
          fetchStationsByLineGroupIdError ??
          null
        }
        onTrainTypeSelect={handleTrainTypeSelect}
      />
      {/* ウォークスルー */}
      {currentStep && (
        <WalkthroughOverlay
          visible={isWalkthroughActive}
          step={currentStep}
          currentStepIndex={currentStepIndex}
          totalSteps={totalSteps}
          onNext={nextStep}
          onGoToStep={goToStep}
          onSkip={skipWalkthrough}
        />
      )}
    </>
  );
};

export default React.memo(SelectLineScreen);
