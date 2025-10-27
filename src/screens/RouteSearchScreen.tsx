import { useLazyQuery } from '@apollo/client/react';
import { useAtom } from 'jotai';
import uniqBy from 'lodash/uniqBy';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { SEARCH_STATION_RESULT_LIMIT } from 'react-native-dotenv';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Station, TrainType } from '~/@types/graphql';
import { EmptyLineSeparator } from '~/components/EmptyLineSeparator';
import { EmptyResult } from '~/components/EmptyResult';
import FooterTabBar from '~/components/FooterTabBar';
import { Heading } from '~/components/Heading';
import { LineCard } from '~/components/LineCard';
import { NowHeader } from '~/components/NowHeader';
import { SearchBar } from '~/components/SearchBar';
import { SelectBoundModal } from '~/components/SelectBoundModal';
import { TrainTypeListModal } from '~/components/TrainTypeListModal';
import {
  GET_LINE_GROUP_STATIONS,
  GET_LINE_STATIONS,
  GET_ROUTE_TYPES,
  GET_STATIONS_BY_NAME,
} from '~/lib/graphql/queries';
import navigationState from '~/store/atoms/navigation';
import { useThemeStore } from '../hooks';
import { APP_THEME } from '../models/Theme';
import lineState from '../store/atoms/line';
import stationState from '../store/atoms/station';
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

  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED);

  const [{ station }, setStationState] = useAtom(stationState);
  const [lineAtom, setLineState] = useAtom(lineState);
  const { pendingLine } = lineAtom;
  const [{ pendingWantedDestination }, setNavigationState] =
    useAtom(navigationState);

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
      setSearchResults([]);

      if (!query.trim().length) {
        setHasSearched(false);
        return [] as Station[];
      }
      setHasSearched(true);
      const parsedLimit = Number.parseInt(SEARCH_STATION_RESULT_LIMIT, 10);
      const limit =
        Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 50 : parsedLimit;
      const result = await fetchByName({
        variables: {
          name: query.trim(),
          limit,
          fromStationGroupId: station?.groupId ?? undefined,
        },
      });
      const stations = result.data?.stationsByName ?? [];

      setSearchResults(uniqBy(stations, 'id'));
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
      if (selectedStation.hasTrainTypes) {
        setTrainTypeListModalVisible(true);
      }

      setNavigationState((prev) => ({
        ...prev,
        trainType: null,
      }));
      setStationState((prev) => ({
        ...prev,
        pendingStations: [],
      }));
      setLineState((prev) => ({
        ...prev,
        pendingLine: selectedStation.line ?? null,
      }));
      setNavigationState((prev) => ({
        ...prev,
        pendingWantedDestination: selectedStation,
      }));

      if (selectedStation.hasTrainTypes) {
        return;
      }

      // Guard: ensure both lineId and stationId are present before calling the query
      if (!selectedStation.line?.id || !selectedStation.id) {
        return;
      }

      setSelectBoundModalVisible(true);

      const result = await fetchStationsByLineId({
        variables: {
          lineId: selectedStation.line.id,
          stationId: selectedStation.id,
        },
      });

      const newPendingStations = result.data?.lineStations ?? [];
      setStationState((prev) => ({
        ...prev,
        pendingStations: newPendingStations,
      }));
    },
    [fetchStationsByLineId, setNavigationState, setStationState, setLineState]
  );

  const renderItem = useCallback(
    ({ item }: { item: Station }) => {
      const line = item.line;

      if (!line) return null;

      return (
        <LineCard
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

  const handleTrainTypeSelected = useCallback(
    async (trainType: TrainType) => {
      if (!trainType.groupId) return;

      setSelectBoundModalVisible(true);

      setNavigationState((prev) => ({
        ...prev,
        trainType,
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

  const keyExtractor = useCallback(
    (s: Station, index: number) =>
      s.id?.toString() ?? `fallback-${index}-${s.groupId ?? s.name}`,
    []
  );
  const handleScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const currentStationInRoutes = useMemo<Station | null>(() => {
    if (!station || !pendingLine) return null;

    const notConnectedToOthersLine = station.lines?.find(
      (l) => l.id === pendingLine.id
    );

    if (notConnectedToOthersLine) {
      return { ...station, line: notConnectedToOthersLine } as Station;
    }

    const currentIds = new Set(
      (station.lines ?? []).map((l) => l?.id).filter(Boolean)
    );
    const trainTypes = routeTypesData?.routeTypes?.trainTypes ?? [];

    // Get all line IDs from the train types
    const routeLineIdSet = new Set(
      trainTypes
        .flatMap((tt: TrainType) => [
          tt.line?.id,
          ...(tt.lines ?? []).map((l) => l.id),
        ])
        .filter(Boolean)
    );

    const commonIds = [...currentIds].filter((id) => routeLineIdSet.has(id));
    const commonLine = (station.lines ?? []).find((l) =>
      commonIds.includes(l.id)
    );

    if (!commonLine) return { ...station, line: pendingLine } as Station;

    return { ...station, line: commonLine } as Station;
  }, [station, pendingLine, routeTypesData?.routeTypes]);

  useEffect(() => {
    if (!currentStationInRoutes) return;
    setStationState((prev) => {
      if (prev.pendingStation?.groupId === currentStationInRoutes.groupId) {
        return prev;
      }
      return {
        ...prev,
        pendingStation: currentStationInRoutes,
      };
    });
  }, [currentStationInRoutes, setStationState]);

  useEffect(() => {
    setLineState((prev) => {
      if (prev.pendingLine?.id === pendingLine?.id) {
        return prev;
      }
      return {
        ...prev,
        pendingLine,
      };
    });
  }, [pendingLine, setLineState]);

  useEffect(() => {
    const fetchAsync = async () => {
      const fromStationGroupId = station?.groupId;
      const toStationGroupId = pendingWantedDestination?.groupId;
      if (!fromStationGroupId || !toStationGroupId) {
        return;
      }

      const fetchedTrainTypesData = await fetchRouteTypes({
        variables: {
          fromStationGroupId,
          toStationGroupId,
        },
      });
      const fetchedTrainTypes = (
        fetchedTrainTypesData.data?.routeTypes.trainTypes ?? []
      ).filter((tt) => {
        if (tt.line?.id === currentStationInRoutes?.line?.id) {
          return true;
        }

        return tt.lines?.some((l) => l.id === currentStationInRoutes?.line?.id);
      });

      setNavigationState((prev) => ({
        ...prev,
        fetchedTrainTypes,
      }));
    };

    fetchAsync();
  }, [
    fetchRouteTypes,
    setNavigationState,
    currentStationInRoutes?.line?.id,
    pendingWantedDestination?.groupId,
    station?.groupId,
  ]);

  return (
    <>
      <SafeAreaView style={[styles.root, !isLEDTheme && styles.nonLEDBg]}>
        <Animated.FlatList<Station>
          style={StyleSheet.absoluteFill}
          data={searchResults}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ItemSeparatorComponent={EmptyLineSeparator}
          ListEmptyComponent={
            <EmptyResult
              loading={byNameLoading || fetchRouteTypesLoading}
              hasSearched={hasSearched}
            />
          }
          ListHeaderComponent={
            <View style={styles.listHeaderContainer}>
              <View style={styles.searchBarContainer}>
                <SearchBar onSearch={handleSearch} />
              </View>
              <Heading style={styles.searchResultHeading}>
                {translate('searchResult')}
              </Heading>
            </View>
          }
          ListFooterComponent={EmptyLineSeparator}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[
            styles.listContainerStyle,
            nowHeaderHeight ? { paddingTop: nowHeaderHeight } : null,
          ]}
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
          // SelectBoundModalを閉じるだけで、選択状態はリセットしない
          // (TrainTypeListModalに戻れるようにする)
          setSelectBoundModalVisible(false);
        }}
        onBoundSelect={() => {
          setSelectBoundModalVisible(false);
          setTrainTypeListModalVisible(false);
        }}
        loading={
          fetchStationsByLineIdLoading ||
          fetchStationsByLineGroupIdLoading ||
          fetchRouteTypesLoading
        }
        error={
          fetchStationsByLineIdError ??
          fetchStationsByLineGroupIdError ??
          fetchRouteTypesError ??
          null
        }
        onTrainTypeSelect={handleTrainTypeSelected}
      />
      <TrainTypeListModal
        visible={trainTypeListModalVisible}
        line={currentStationInRoutes?.line ?? null}
        destination={pendingWantedDestination}
        onClose={() => {
          // キャンセル時のみリセット
          setLineState((prev) => ({ ...prev, pendingLine: null }));
          setStationState((prev) => ({
            ...prev,
            pendingStation: null,
            pendingStations: [],
          }));
          setNavigationState((prev) => ({
            ...prev,
            trainType: null,
            fetchedTrainTypes: [],
            pendingWantedDestination: null,
          }));
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
