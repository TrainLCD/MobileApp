import {
  FlashList,
  type FlashListProps,
  type ListRenderItemInfo,
} from '@shopify/flash-list';
import { useQueryClient } from '@tanstack/react-query';
import { Orientation } from 'expo-screen-orientation';
import { useAtomValue, useSetAtom } from 'jotai';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert, Animated as RNAnimated, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Station, TrainType } from '~/@types/graphql';
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
import { useDeviceOrientation } from '~/hooks/useDeviceOrientation';
import { useLazyGraphQLQuery } from '~/hooks/useLazyGraphQLQuery';
import { useRouteSearchWalkthrough } from '~/hooks/useRouteSearchWalkthrough';
import { graphqlQueryKey } from '~/lib/gql';
import {
  GET_LINE_GROUP_STATIONS,
  GET_LINE_STATIONS,
  GET_ROUTE_TYPES_LIGHT,
  GET_STATIONS_BY_NAME,
} from '~/lib/graphql/queries';
import navigationState from '~/store/atoms/navigation';
import isTablet from '~/utils/isTablet';
import {
  computeCurrentStationInRoutes,
  getStationWithMatchingLine,
} from '~/utils/routeSearch';
import { findLocalType } from '~/utils/trainTypeString';
import lineState, { pendingLineAtom } from '../store/atoms/line';
import stationState, {
  stationAtom,
  wantedDestinationAtom,
} from '../store/atoms/station';
import { isLEDThemeAtom } from '../store/atoms/theme';
import { isJapanese, translate } from '../translation';

type GetRouteTypesData = {
  routeTypes: {
    nextPageToken: string | null;
    trainTypes: TrainType[];
  };
};

type GetRouteTypesVariables = {
  fromStationGroupId: number;
  toStationGroupId: number;
  pageSize?: number;
  pageToken?: string;
  viaLineId?: number;
};

type GetStationsByNameData = {
  stationsByName: Station[];
};

type GetStationsByNameVariables = {
  name: string;
  limit?: number;
  fromStationGroupId?: number;
};

type GetLineStationsData = {
  lineStations: Station[];
};

type GetLineStationsVariables = {
  lineId: number;
  stationId?: number;
};

type GetLineGroupStationsData = {
  lineGroupStations: Station[];
};

type GetLineGroupStationsVariables = {
  lineGroupId: number;
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
  searchBarContainer: {
    marginBottom: 48,
  },
  listContainerStyle: {
    paddingHorizontal: 24,
    paddingBottom: 128,
  },
  searchResultHeading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
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
  const [selectBoundModalVisible, setSelectBoundModalVisible] = useState(false);
  const [trainTypeListModalVisible, setTrainTypeListModalVisible] =
    useState(false);
  const [searchResults, setSearchResults] = useState<Station[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedDestination, setSelectedDestination] =
    useState<Station | null>(null);

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
  const wantedDestination = useAtomValue(wantedDestinationAtom);
  const setStationState = useSetAtom(stationState);
  const setNavigationState = useSetAtom(navigationState);
  const pendingLine = useAtomValue(pendingLineAtom);
  const setLineState = useSetAtom(lineState);

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
  } = useRouteSearchWalkthrough();

  const searchBarRef = useRef<View>(null);
  const searchResultsRef = useRef<View>(null);
  const [searchBarLayout, setSearchBarLayout] = useState<{
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

  const [
    fetchRouteTypes,
    {
      data: routeTypesData,
      loading: fetchRouteTypesLoading,
      error: fetchRouteTypesError,
    },
  ] = useLazyGraphQLQuery<GetRouteTypesData, GetRouteTypesVariables>(
    GET_ROUTE_TYPES_LIGHT
  );

  const [fetchByName, { loading: byNameLoading, error: byNameError }] =
    useLazyGraphQLQuery<GetStationsByNameData, GetStationsByNameVariables>(
      GET_STATIONS_BY_NAME
    );

  const [
    fetchStationsByLineId,
    {
      loading: fetchStationsByLineIdLoading,
      error: fetchStationsByLineIdError,
    },
  ] = useLazyGraphQLQuery<GetLineStationsData, GetLineStationsVariables>(
    GET_LINE_STATIONS
  );

  const [
    fetchStationsByLineGroupId,
    {
      loading: fetchStationsByLineGroupIdLoading,
      error: fetchStationsByLineGroupIdError,
    },
  ] = useLazyGraphQLQuery<
    GetLineGroupStationsData,
    GetLineGroupStationsVariables
  >(GET_LINE_GROUP_STATIONS);

  const queryClient = useQueryClient();

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
      Alert.alert(translate('errorTitle'), translate('apiErrorText'));
    }
  }, [byNameError]);

  const handleLineSelected = useCallback(
    async (selectedStation: Station) => {
      setSelectBoundModalVisible(true);
      setSelectedDestination(selectedStation);

      const newPendingLine = selectedStation.line ?? null;

      setNavigationState((prev) => ({
        ...prev,
        trainType: null,
        pendingTrainType: null,
      }));
      setStationState((prev) => ({
        ...prev,
        pendingStations: [],
        wantedDestination: null,
      }));
      setLineState((prev) => ({
        ...prev,
        pendingLine: newPendingLine,
      }));

      // Guard: ensure both lineId and stationId are present before calling the query
      if (
        !selectedStation.groupId ||
        !selectedStation.line?.id ||
        !station?.groupId
      ) {
        return;
      }

      const result = await fetchRouteTypes({
        variables: {
          fromStationGroupId: station.groupId,
          toStationGroupId: selectedStation.groupId,
          pageSize: SEARCH_STATION_RESULT_LIMIT,
          viaLineId: selectedStation.line.id,
        },
      });

      const fetchedTrainTypes = result.data?.routeTypes.trainTypes ?? [];

      if (!fetchedTrainTypes?.length) {
        if (!selectedStation.line?.id) {
          return;
        }
        // 列車種別が存在しない場合は選択した行き先駅の路線を使用
        setLineState((prev) => ({
          ...prev,
          pendingLine: selectedStation.line ?? null,
        }));
        // 現在の駅の路線情報を選択した路線に合わせて更新
        const updatedStation = getStationWithMatchingLine(
          station,
          selectedStation.line ?? null
        );
        setStationState((prev) => ({
          ...prev,
          pendingStation: updatedStation,
          station: updatedStation,
        }));
        const stationsByLineIdRes = await fetchStationsByLineId({
          variables: {
            lineId: selectedStation.line.id,
          },
        });
        const stations = stationsByLineIdRes.data?.lineStations ?? [];
        setStationState((prev) => ({
          ...prev,
          pendingStations: stations,
        }));
        return;
      }

      // 先に選択される列車種別を決定
      const localTrainType =
        findLocalType(fetchedTrainTypes) ?? fetchedTrainTypes[0];

      if (!localTrainType?.groupId) {
        return;
      }

      // 選択された列車種別のみを使って路線を決定
      const newCurrentStation = computeCurrentStationInRoutes(
        station,
        newPendingLine,
        [localTrainType]
      );
      if (newCurrentStation) {
        setStationState((prev) => {
          const isSamePendingStation =
            prev.pendingStation?.groupId === newCurrentStation.groupId;
          const isSameStationLine =
            prev.station?.line?.id === newCurrentStation.line?.id;

          if (isSamePendingStation && isSameStationLine) {
            return prev;
          }
          return {
            ...prev,
            pendingStation: isSamePendingStation
              ? prev.pendingStation
              : newCurrentStation,
            // stationのlineも列車種別とマッチする路線に更新
            station: prev.station
              ? { ...prev.station, line: newCurrentStation.line }
              : prev.station,
          };
        });
        // pendingLineを現在の駅にマッチする路線に更新
        if (newCurrentStation.line) {
          setLineState((prev) => ({
            ...prev,
            pendingLine: newCurrentStation.line ?? null,
          }));
        }
      }

      const stationsByLineGroupIdRes = await fetchStationsByLineGroupId({
        variables: { lineGroupId: localTrainType.groupId },
      });
      const stations = stationsByLineGroupIdRes.data?.lineGroupStations ?? [];
      setStationState((prev) => ({
        ...prev,
        pendingStations: stations,
      }));
      setNavigationState((prev) => ({
        ...prev,
        fetchedTrainTypes,
        pendingTrainType: localTrainType,
      }));
    },
    [
      station,
      fetchStationsByLineId,
      fetchStationsByLineGroupId,
      fetchRouteTypes,
      setNavigationState,
      setStationState,
      setLineState,
    ]
  );

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
          onPress={() => handleLineSelected(item)}
        />
      );
    },
    [handleLineSelected, fetchRouteTypesLoading]
  );

  const renderItem = ({ item, index }: ListRenderItemInfo<Station>) => {
    const columnIndex = index % numColumns;

    return (
      <View
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

  const handleTrainTypeSelected = useCallback(
    async (trainType: TrainType) => {
      if (!trainType.groupId) return;

      setSelectBoundModalVisible(true);

      setNavigationState((prev) => ({
        ...prev,
        pendingTrainType: trainType,
      }));

      // キャッシュ済みでも常に最新の駅一覧を取得したいので該当キーを破棄する
      queryClient.removeQueries({
        queryKey: graphqlQueryKey(GET_LINE_GROUP_STATIONS, {
          lineGroupId: trainType.groupId,
        }),
      });

      const pendingStationsData = await fetchStationsByLineGroupId({
        variables: {
          lineGroupId: trainType.groupId,
        },
      });
      const pendingStations = pendingStationsData.data?.lineGroupStations ?? [];
      setStationState((prev) => ({
        ...prev,
        pendingStations,
      }));
    },
    [
      fetchStationsByLineGroupId,
      setStationState,
      setNavigationState,
      queryClient,
    ]
  );

  // NowHeader のスクロール連動アニメーションを native driver で駆動する
  // (AnimatedFlashList にアタッチされ、スクロールイベントは UI スレッドで scrollY へ反映される)
  const handleScroll = RNAnimated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true }
  );

  const currentStationInRoutes = useMemo<Station | null>(
    () =>
      computeCurrentStationInRoutes(
        station,
        pendingLine,
        routeTypesData?.routeTypes?.trainTypes ?? []
      ),
    [station, pendingLine, routeTypesData?.routeTypes]
  );

  const currentStationLineForTrainTypeModal = useMemo(() => {
    const currentLine = currentStationInRoutes?.line;
    const currentStationLines = station?.lines ?? [];

    if (
      currentLine &&
      currentStationLines.some(
        (stationLine) => stationLine.id === currentLine.id
      )
    ) {
      return currentLine;
    }

    return station?.line ?? currentStationLines[0] ?? null;
  }, [currentStationInRoutes?.line, station?.line, station?.lines]);

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
              <View
                ref={searchBarRef}
                style={styles.searchBarContainer}
                onLayout={measureSearchBar}
              >
                <SearchBar onSearch={handleSearch} />
              </View>
              <Heading style={styles.searchResultHeading}>
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
        onClose={() => {
          setSelectBoundModalVisible(false);
        }}
        onCloseAnimationEnd={() => {
          setSelectedDestination(null);
        }}
        onBoundSelect={() => {
          setSelectBoundModalVisible(false);
          setTrainTypeListModalVisible(false);
        }}
        loading={
          fetchRouteTypesLoading ||
          fetchStationsByLineIdLoading ||
          fetchStationsByLineGroupIdLoading
        }
        error={
          fetchRouteTypesError ??
          fetchStationsByLineIdError ??
          fetchStationsByLineGroupIdError ??
          null
        }
        onTrainTypeSelect={handleTrainTypeSelected}
        targetDestination={selectedDestination}
      />
      <TrainTypeListModal
        visible={trainTypeListModalVisible}
        line={currentStationLineForTrainTypeModal}
        destination={wantedDestination}
        boardingStation={station}
        onClose={() => {
          setTrainTypeListModalVisible(false);
        }}
        onSelect={handleTrainTypeSelected}
        loading={
          fetchStationsByLineIdLoading ||
          fetchStationsByLineGroupIdLoading ||
          fetchRouteTypesLoading
        }
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
