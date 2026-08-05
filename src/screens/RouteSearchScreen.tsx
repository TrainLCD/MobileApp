import {
  FlashList,
  type FlashListProps,
  type ListRenderItemInfo,
} from '@shopify/flash-list';
import { Orientation } from 'expo-screen-orientation';
import { useAtomValue } from 'jotai';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated as RNAnimated, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Station } from '~/@types/graphql';
import { CommonCard } from '~/components/CommonCard';
import { EmptyLineSeparator } from '~/components/EmptyLineSeparator';
import { EmptyResult } from '~/components/EmptyResult';
import FooterTabBar from '~/components/FooterTabBar';
import { Heading } from '~/components/Heading';
import { NowHeader } from '~/components/NowHeader';
import { SearchBar } from '~/components/SearchBar';
import { SelectBoundModal } from '~/components/SelectBoundModal';
import { TrainTypeListModal } from '~/components/TrainTypeListModal';
import WalkthroughOverlay from '~/components/WalkthroughOverlay';
import { useAIAgentFeatureEnabled } from '~/hooks/useAIAgentFeatureEnabled';
import { useDestinationSelection } from '~/hooks/useDestinationSelection';
import { useDeviceOrientation } from '~/hooks/useDeviceOrientation';
import { useLazyGraphQLQuery } from '~/hooks/useLazyGraphQLQuery';
import { useRouteSearchWalkthrough } from '~/hooks/useRouteSearchWalkthrough';
import { GET_STATIONS_BY_NAME } from '~/lib/graphql/queries';
import { AgentEntryBanner } from '~/screens/DestinationAgent/AgentEntryBanner';
import { showDialogWhilePresenting } from '~/utils/dialogPresentation';
import isTablet from '~/utils/isTablet';
import { stationAtom } from '../store/atoms/station';
import { isLEDThemeAtom } from '../store/atoms/theme';
import { isJapanese, translate } from '../translation';

type GetStationsByNameData = {
  stationsByName: Station[];
};

type GetStationsByNameVariables = {
  name: string;
  limit?: number;
  fromStationGroupId?: number;
};

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 24,
    flex: 1,
  },
  nonLEDBg: {
    backgroundColor: '#FAFAFA',
  },
  listHeaderContainer: {
    marginTop: 16,
  },
  listContainerStyle: {
    paddingHorizontal: 24,
    paddingBottom: 128,
  },
  // AI相談バナーは検索バーと検索結果見出しの間の余白(従来 marginBottom: 48)に置く。
  // バナー非表示時に従来と同じ余白を保つため、間隔は見出し側の marginTop で確保する。
  agentEntryBannerContainer: {
    marginTop: 16,
  },
  searchResultHeading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 48,
    marginBottom: 16,
  },
  // バナー表示時はバナーとの間隔を Figma 指定の 24 に詰める
  searchResultHeadingWithBanner: {
    marginTop: 24,
  },
  // 従来は行間に EmptyLineSeparator(height: 8) を挟んでいたが、
  // FlashList の ItemSeparatorComponent は numColumns 使用時に各セル内へ描画されるため
  // 2行目以降のセルに paddingTop で同じ間隔を再現する
  rowSpacing: {
    paddingTop: 8,
  },
});

const SEARCH_STATION_RESULT_LIMIT = 100;

// タブレット表示で従来のレイアウト(flexDirection: 'row', gap: 16)と同じカード間隔
const CARD_COLUMN_GAP = 16;

// onScroll に useNativeDriver: true の Animated.event を直接アタッチするため
// FlashList を RN Animated 対応コンポーネントにラップする
// (FlashListRef が getScrollableNode を公開しているため native イベントが接続できる)
const AnimatedFlashList = RNAnimated.createAnimatedComponent(
  FlashList as unknown as React.ComponentType<FlashListProps<Station>>
);

const RouteSearchScreen = () => {
  const [nowHeaderHeight, setNowHeaderHeight] = useState(0);
  const [searchResults, setSearchResults] = useState<Station[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const isLEDTheme = useAtomValue(isLEDThemeAtom);
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

  const station = useAtomValue(stationAtom);
  // AgentEntryBanner と同じフラグを購読し、バナー表示時の見出し余白を Figma 指定へ切り替える
  const aiAgentEnabled = useAIAgentFeatureEnabled();

  const {
    handleDestinationSelected,
    handleTrainTypeSelected,
    selectBoundModalVisible,
    trainTypeListModalVisible,
    selectedDestination,
    wantedDestination,
    trainTypeModalLine,
    fetchRouteTypesLoading,
    modalLoading,
    modalError,
    handleCloseSelectBoundModal,
    handleSelectBoundModalCloseAnimationEnd,
    handleBoundSelected,
    handleCloseTrainTypeListModal,
  } = useDestinationSelection();

  const scrollY = useRef(new RNAnimated.Value(0)).current;

  // ウォークスルー関連
  const {
    isWalkthroughActive,
    currentStepIndex,
    currentStepId,
    currentStep,
    totalSteps,
    nextStep,
    goToStep,
    skipWalkthrough,
    setSpotlightArea,
  } = useRouteSearchWalkthrough(aiAgentEnabled);

  const searchBarRef = useRef<View>(null);
  const agentEntryBannerRef = useRef<View>(null);
  const searchResultsRef = useRef<View>(null);
  const [searchBarLayout, setSearchBarLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [agentEntryBannerLayout, setAgentEntryBannerLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [searchResultsLayout, setSearchResultsLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  // 駅グループが変更されたら検索結果をクリア
  // biome-ignore lint/correctness/useExhaustiveDependencies: station?.groupId の変更を意図的に監視
  useEffect(() => {
    setSearchResults([]);
    setHasSearched(false);
  }, [station?.groupId]);

  const [fetchByName, { loading: byNameLoading, error: byNameError }] =
    useLazyGraphQLQuery<GetStationsByNameData, GetStationsByNameVariables>(
      GET_STATIONS_BY_NAME
    );

  const handleSearch = useCallback(
    async (query: string) => {
      if (!station?.groupId) return;

      setSearchResults([]);

      if (!query.trim().length) {
        setHasSearched(false);
        return [] as Station[];
      }
      setHasSearched(true);
      const result = await fetchByName({
        variables: {
          name: query.trim(),
          limit: SEARCH_STATION_RESULT_LIMIT,
          fromStationGroupId: station.groupId,
        },
      });
      const stations = result.data?.stationsByName ?? [];

      setSearchResults(stations);
    },
    [fetchByName, station?.groupId]
  );

  useEffect(() => {
    if (byNameError) {
      showDialogWhilePresenting(
        'routeSearchFetchError',
        translate('errorTitle'),
        translate('apiErrorText')
      );
    }
  }, [byNameError]);

  const renderCard = useCallback(
    (item: Station) => {
      const line = item.line;

      if (!line) return null;

      return (
        <CommonCard
          targetStation={item}
          line={line}
          title={
            isJapanese ? item.name || undefined : item.nameRoman || undefined
          }
          subtitle={
            isJapanese
              ? line.nameShort || undefined
              : line.nameRoman || undefined
          }
          loading={fetchRouteTypesLoading}
          onPress={() => handleDestinationSelected(item)}
        />
      );
    },
    [handleDestinationSelected, fetchRouteTypesLoading]
  );

  const renderItem = ({ item, index }: ListRenderItemInfo<Station>) => {
    const columnIndex = index % numColumns;

    return (
      <View
        ref={index === 0 ? searchResultsRef : undefined}
        onLayout={index === 0 ? measureSearchResults : undefined}
        style={[
          index >= numColumns && styles.rowSpacing,
          // タブレットではセル幅が listWidth / numColumns 固定になるため、
          // 各セルの左右 padding を列位置に応じて振り分けることで
          // 従来の gap: 16 と同一のカード幅・カード間隔を再現する
          isTablet && {
            paddingLeft: (CARD_COLUMN_GAP * columnIndex) / numColumns,
            paddingRight:
              (CARD_COLUMN_GAP * (numColumns - 1 - columnIndex)) / numColumns,
          },
        ]}
      >
        {renderCard(item)}
      </View>
    );
  };

  const keyExtractor = (s: Station, index: number) =>
    `${s.groupId ?? 0}-${s.id ?? index}`;

  // NowHeader のスクロール連動アニメーションを native driver で駆動する
  // (AnimatedFlashList にアタッチされ、スクロールイベントは UI スレッドで scrollY へ反映される)
  const handleScroll = RNAnimated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true }
  );

  // ウォークスルーのレイアウト計測
  const measureSearchBar = useCallback(() => {
    if (searchBarRef.current) {
      searchBarRef.current.measureInWindow(
        (x: number, y: number, width: number, height: number) => {
          setSearchBarLayout({ x, y, width, height });
        }
      );
    }
  }, []);

  const measureSearchResults = useCallback(() => {
    if (searchResultsRef.current) {
      searchResultsRef.current.measureInWindow(
        (x: number, y: number, width: number, height: number) => {
          setSearchResultsLayout({ x, y, width, height });
        }
      );
    }
  }, []);

  const measureAgentEntryBanner = useCallback(() => {
    if (agentEntryBannerRef.current) {
      agentEntryBannerRef.current.measureInWindow(
        (x: number, y: number, width: number, height: number) => {
          setAgentEntryBannerLayout({ x, y, width, height });
        }
      );
    }
  }, []);

  // ステップが変わった時にレイアウトを再計測
  useEffect(() => {
    if (currentStepId === 'routeSearchBar') {
      // 少し遅延させてレイアウトが安定してから計測
      const timer = setTimeout(() => {
        measureSearchBar();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentStepId, measureSearchBar]);

  useEffect(() => {
    if (currentStepId === 'routeSearchAgentBanner') {
      const timer = setTimeout(() => {
        measureAgentEntryBanner();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentStepId, measureAgentEntryBanner]);

  useEffect(() => {
    if (currentStepId === 'routeSearchResults') {
      const timer = setTimeout(() => {
        measureSearchResults();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentStepId, measureSearchResults]);

  // ウォークスルーのスポットライト設定
  useEffect(() => {
    if (currentStepId === 'routeSearchBar' && searchBarLayout) {
      setSpotlightArea({
        x: searchBarLayout.x,
        y: searchBarLayout.y,
        width: searchBarLayout.width,
        height: searchBarLayout.height,
        borderRadius: 8,
      });
    }
  }, [currentStepId, searchBarLayout, setSpotlightArea]);

  useEffect(() => {
    if (currentStepId === 'routeSearchAgentBanner' && agentEntryBannerLayout) {
      setSpotlightArea({
        x: agentEntryBannerLayout.x,
        y: agentEntryBannerLayout.y,
        width: agentEntryBannerLayout.width,
        height: agentEntryBannerLayout.height,
        borderRadius: 8,
      });
    }
  }, [currentStepId, agentEntryBannerLayout, setSpotlightArea]);

  useEffect(() => {
    if (currentStepId === 'routeSearchResults' && searchResultsLayout) {
      setSpotlightArea({
        x: searchResultsLayout.x,
        y: searchResultsLayout.y,
        width: searchResultsLayout.width,
        height: Math.min(searchResultsLayout.height, 200),
        borderRadius: 12,
      });
    }
  }, [currentStepId, searchResultsLayout, setSpotlightArea]);

  return (
    <>
      <SafeAreaView style={[styles.root, !isLEDTheme && styles.nonLEDBg]}>
        <AnimatedFlashList
          style={StyleSheet.absoluteFill}
          data={searchResults}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={numColumns}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[
            styles.listContainerStyle,
            nowHeaderHeight ? { paddingTop: nowHeaderHeight } : null,
          ]}
          ListHeaderComponent={
            <View style={styles.listHeaderContainer}>
              <View ref={searchBarRef} onLayout={measureSearchBar}>
                <SearchBar onSearch={handleSearch} />
              </View>
              {aiAgentEnabled && (
                <View
                  ref={agentEntryBannerRef}
                  onLayout={measureAgentEntryBanner}
                  style={styles.agentEntryBannerContainer}
                >
                  <AgentEntryBanner />
                </View>
              )}
              <Heading
                style={[
                  styles.searchResultHeading,
                  aiAgentEnabled && styles.searchResultHeadingWithBanner,
                ]}
              >
                {translate('searchResult')}
              </Heading>
            </View>
          }
          ListEmptyComponent={
            <View ref={searchResultsRef} onLayout={measureSearchResults}>
              <EmptyResult
                loading={byNameLoading || fetchRouteTypesLoading}
                hasSearched={hasSearched}
              />
            </View>
          }
          ListFooterComponent={EmptyLineSeparator}
        />
      </SafeAreaView>

      <NowHeader
        station={station}
        onLayout={(e) => setNowHeaderHeight(e.nativeEvent.layout.height)}
        scrollY={scrollY}
      />
      {/* フッター */}
      <FooterTabBar active="search" />

      <SelectBoundModal
        visible={selectBoundModalVisible}
        onClose={handleCloseSelectBoundModal}
        onCloseAnimationEnd={handleSelectBoundModalCloseAnimationEnd}
        onBoundSelect={handleBoundSelected}
        loading={modalLoading}
        error={modalError}
        onTrainTypeSelect={handleTrainTypeSelected}
        targetDestination={selectedDestination}
      />
      <TrainTypeListModal
        visible={trainTypeListModalVisible}
        line={trainTypeModalLine}
        destination={wantedDestination}
        boardingStation={station}
        onClose={handleCloseTrainTypeListModal}
        onSelect={handleTrainTypeSelected}
        loading={modalLoading}
      />

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

export default React.memo(RouteSearchScreen);
