import { useLazyQuery } from '@apollo/client/react';
import { useAtom, useSetAtom } from 'jotai';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { SEARCH_STATION_RESULT_LIMIT } from 'react-native-dotenv';
import Animated, {
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
import {
  GET_LINE_GROUP_STATIONS,
  GET_LINE_STATIONS,
  GET_ROUTE_TYPES,
  GET_STATIONS_BY_NAME,
} from '~/lib/graphql/queries';
import navigationState from '~/store/atoms/navigation';
import { findLocalType } from '~/utils/trainTypeString';
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

  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED);

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

      setNavigationState((prev) => ({
        ...prev,
        trainType: null,
      }));
      setStationState((prev) => ({
        ...prev,
        pendingStations: [],
        wantedDestination: null,
      }));
      setLineState((prev) => ({
        ...prev,
        pendingLine: selectedStation.line ?? null,
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
        if (!station.line?.id) {
          return;
        }
        const stationsByLineIdRes = await fetchStationsByLineId({
          variables: {
            lineId: station?.line?.id,
          },
        });
        const stations = stationsByLineIdRes.data?.lineStations ?? [];
        setStationState((prev) => ({
          ...prev,
          pendingStations: stations,
        }));
        return;
      }

      const localTrainType =
        findLocalType(fetchedTrainTypes) ?? fetchedTrainTypes[0];

      if (!localTrainType?.groupId) {
        return;
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
        trainType: prev.trainType ?? localTrainType,
      }));
    },
    [
      station?.line?.id,
      station?.groupId,
      fetchStationsByLineId,
      fetchStationsByLineGroupId,
      fetchRouteTypes,
      setNavigationState,
      setStationState,
      setLineState,
    ]
  );

  const renderItem = useCallback(
    ({ item }: { item: Station }) => {
      const line = item.line;

      if (!line) return null;

      return (
        <CommonCard
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
