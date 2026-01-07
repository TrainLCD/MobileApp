import { useLazyQuery } from '@apollo/client/react';
import { Orientation } from 'expo-screen-orientation';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { SEARCH_STATION_RESULT_LIMIT } from 'react-native-dotenv';
import Animated, {
  LinearTransition,
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
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
import { useDeviceOrientation } from '~/hooks/useDeviceOrientation';
import {
  GET_LINE_GROUP_STATIONS,
  GET_LINE_STATIONS,
  GET_ROUTE_TYPES,
  GET_STATIONS_BY_NAME,
} from '~/lib/graphql/queries';
import navigationState from '~/store/atoms/navigation';
import isTablet from '~/utils/isTablet';
import {
  computeCurrentStationInRoutes,
  getStationWithMatchingLine,
} from '~/utils/routeSearch';
import { findLocalType } from '~/utils/trainTypeString';
import lineState from '../store/atoms/line';
import stationState from '../store/atoms/station';
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
});

const RouteSearchScreen = () => {
  const [nowHeaderHeight, setNowHeaderHeight] = useState(0);
  const [selectBoundModalVisible, setSelectBoundModalVisible] = useState(false);
  const [trainTypeListModalVisible, setTrainTypeListModalVisible] =
    useState(false);
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

  const [{ station, wantedDestination }, setStationState] =
    useAtom(stationState);
  const setNavigationState = useSetAtom(navigationState);
  const [lineAtom, setLineState] = useAtom(lineState);
  const { pendingLine } = lineAtom;

  const scrollY = useSharedValue(0);

  const [
    fetchRouteTypes,
    {
      data: routeTypesData,
      loading: fetchRouteTypesLoading,
      error: fetchRouteTypesError,
    },
  ] = useLazyQuery<GetRouteTypesData, GetRouteTypesVariables>(GET_ROUTE_TYPES);

  const [fetchByName, { loading: byNameLoading, error: byNameError }] =
    useLazyQuery<GetStationsByNameData, GetStationsByNameVariables>(
      GET_STATIONS_BY_NAME
    );

  const [
    fetchStationsByLineId,
    {
      loading: fetchStationsByLineIdLoading,
      error: fetchStationsByLineIdError,
    },
  ] = useLazyQuery<GetLineStationsData, GetLineStationsVariables>(
    GET_LINE_STATIONS
  );

  const [
    fetchStationsByLineGroupId,
    {
      loading: fetchStationsByLineGroupIdLoading,
      error: fetchStationsByLineGroupIdError,
      client: fetchStationsByLineGroupIdClient,
    },
  ] = useLazyQuery<GetLineGroupStationsData, GetLineGroupStationsVariables>(
    GET_LINE_GROUP_STATIONS
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
      const limit = Number.parseInt(SEARCH_STATION_RESULT_LIMIT, 10);
      const result = await fetchByName({
        variables: {
          name: query.trim(),
          limit,
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
          pageSize: Number.parseInt(SEARCH_STATION_RESULT_LIMIT, 10),
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
          onPress={() => handleLineSelected(item)}
        />
      );
    },
    [handleLineSelected]
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

  const renderStationRow = useCallback(
    (rowStations: Station[], rowIndex: number) => {
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
            {rowStations.map((item, colIndex) => {
              return (
                <Animated.View
                  layout={LinearTransition.springify()}
                  key={item.id ?? `station-${rowIndex}-${colIndex}`}
                  style={isTablet ? { flex: 1 } : undefined}
                >
                  {renderCard(item)}
                </Animated.View>
              );
            })}
            {renderPlaceholders(rowIndex, numColumns - rowStations.length)}
          </Animated.View>
        </>
      );
    },
    [numColumns, renderCard, renderPlaceholders]
  );

  const handleTrainTypeSelected = useCallback(
    async (trainType: TrainType) => {
      if (!trainType.groupId) return;

      setSelectBoundModalVisible(true);

      setNavigationState((prev) => ({
        ...prev,
        pendingTrainType: trainType,
      }));

      fetchStationsByLineGroupIdClient.cache.evict({
        fieldName: 'lineGroupStations',
        args: { lineGroupId: trainType.groupId },
      });
      fetchStationsByLineGroupIdClient.cache.gc();

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
      fetchStationsByLineGroupIdClient,
    ]
  );

  const handleScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const currentStationInRoutes = useMemo<Station | null>(
    () =>
      computeCurrentStationInRoutes(
        station,
        pendingLine,
        routeTypesData?.routeTypes?.trainTypes ?? []
      ),
    [station, pendingLine, routeTypesData?.routeTypes]
  );

  return (
    <>
      <SafeAreaView style={[styles.root, !isLEDTheme && styles.nonLEDBg]}>
        <Animated.ScrollView
          style={StyleSheet.absoluteFill}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[
            styles.listContainerStyle,
            nowHeaderHeight ? { paddingTop: nowHeaderHeight } : null,
          ]}
        >
          <View style={styles.listHeaderContainer}>
            <View style={styles.searchBarContainer}>
              <SearchBar onSearch={handleSearch} />
            </View>
            <Heading style={styles.searchResultHeading}>
              {translate('searchResult')}
            </Heading>
          </View>

          {!searchResults.length ? (
            <EmptyResult
              loading={byNameLoading || fetchRouteTypesLoading}
              hasSearched={hasSearched}
            />
          ) : (
            Array.from({
              length: Math.ceil(searchResults.length / numColumns),
            }).map((_, rowIndex) => {
              const rowStations = searchResults.slice(
                rowIndex * numColumns,
                (rowIndex + 1) * numColumns
              );
              const rowKey = rowStations.map((s) => s.id).join('-');
              return (
                <React.Fragment key={rowKey}>
                  {renderStationRow(rowStations, rowIndex)}
                </React.Fragment>
              );
            })
          )}

          <EmptyLineSeparator />
        </Animated.ScrollView>
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
      />
      <TrainTypeListModal
        visible={trainTypeListModalVisible}
        line={currentStationInRoutes?.line ?? null}
        destination={wantedDestination}
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
    </>
  );
};

export default React.memo(RouteSearchScreen);
