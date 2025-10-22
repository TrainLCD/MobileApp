import { useLazyQuery } from '@apollo/client/react';
import { useAtomValue } from 'jotai';
import uniqBy from 'lodash/uniqBy';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { SEARCH_STATION_RESULT_LIMIT } from 'react-native-dotenv';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Line, Station, TrainType } from '~/@types/graphql';
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
import { useThemeStore } from '../hooks';
import { APP_THEME } from '../models/Theme';
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
  const [selectedLine, setSelectedLine] = useState<Line | null>(null);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [searchResults, setSearchResults] = useState<Station[]>([]);
  const [selectedTrainType, setSelectedTrainType] = useState<TrainType | null>(
    null
  );
  const [hasSearched, setHasSearched] = useState(false);
  const [cachedTrainTypes, setCachedTrainTypes] = useState<TrainType[]>([]);

  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED);

  const { station } = useAtomValue(stationState);

  const scrollY = useSharedValue(0);

  const [
    mutateRouteTypes,
    {
      data: routeTypesData,
      loading: mutateRouteTypesLoading,
      error: mutateRouteTypesError,
    },
  ] = useLazyQuery<GetRouteTypesData, GetRouteTypesVariables>(GET_ROUTE_TYPES, {
    fetchPolicy: 'no-cache', // FIXME: Apollo Client のキャッシュ問題を回避するため、一時的に no-cache を使用
  });

  const [fetchByName, { loading: byNameLoading, error: byNameError }] =
    useLazyQuery<GetStationsByNameData, GetStationsByNameVariables>(
      GET_STATIONS_BY_NAME
    );

  const [
    mutateStationsByLineId,
    {
      data: stationsByLineIdData,
      loading: mutateStationsByLineIdLoading,
      error: mutateStationsByLineIdError,
    },
  ] = useLazyQuery<GetLineStationsData, GetLineStationsVariables>(
    GET_LINE_STATIONS
  );

  const [
    mutateStationsByLineGroupId,
    {
      data: stationsByLineGroupIdData,
      loading: mutateStationsByLineGroupIdLoading,
      error: mutateStationsByLineGroupIdError,
    },
  ] = useLazyQuery<GetLineGroupStationsData, GetLineGroupStationsVariables>(
    GET_LINE_GROUP_STATIONS
  );

  const mutateRouteTypesStatus = mutateRouteTypesLoading
    ? 'pending'
    : 'success';
  const mutateStationsByLineIdStatus = mutateStationsByLineIdLoading
    ? 'pending'
    : 'success';
  const mutateStationsByLineGroupIdStatus = mutateStationsByLineGroupIdLoading
    ? 'pending'
    : 'success';

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

  // Cache train types when they are first loaded to prevent Apollo cache issues
  useEffect(() => {
    const trainTypes = routeTypesData?.routeTypes?.trainTypes ?? [];
    if (trainTypes.length > 0 && cachedTrainTypes.length === 0) {
      // Deep clone to avoid Apollo cache mutation issues
      setCachedTrainTypes(JSON.parse(JSON.stringify(trainTypes)));
    }
  }, [routeTypesData, cachedTrainTypes.length]);

  const handleLineSelected = useCallback(
    async (selectedStation: Station) => {
      // 新しい検索を開始する前に前回の状態をすべてクリア
      setCachedTrainTypes([]);
      setSelectedTrainType(null);
      setSelectedLine(selectedStation.line ?? null);
      setSelectedStation(selectedStation);

      if (selectedStation.hasTrainTypes) {
        // Guard: ensure both groupIds are present before calling the query
        if (!station?.groupId || !selectedStation.groupId) {
          return;
        }
        setTrainTypeListModalVisible(true);
        mutateRouteTypes({
          variables: {
            fromStationGroupId: station.groupId,
            toStationGroupId: selectedStation.groupId,
          },
        });
        return;
      }

      // Guard: ensure both lineId and stationId are present before calling the query
      if (!selectedStation.line?.id || !selectedStation.id) {
        return;
      }

      setSelectBoundModalVisible(true);

      mutateStationsByLineId({
        variables: {
          lineId: selectedStation.line.id,
          stationId: selectedStation.id,
        },
      });
    },
    [mutateRouteTypes, mutateStationsByLineId, station?.groupId]
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
      setSelectedTrainType(trainType);
      mutateStationsByLineGroupId({
        variables: {
          lineGroupId: trainType.groupId,
        },
      });

      // TrainTypeListModalは閉じずに、SelectBoundModalを開く
      setSelectBoundModalVisible(true);
    },
    [mutateStationsByLineGroupId]
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
    if (!station || !selectedLine) return null;

    const notConnectedToOthersLine = station.lines?.find(
      (l) => l.id === selectedLine.id
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

    if (!commonLine) return { ...station, line: selectedLine } as Station;

    return { ...station, line: commonLine } as Station;
  }, [station, selectedLine, routeTypesData?.routeTypes]);

  const destinationInRoutes = useMemo<Station | null>(() => {
    // Return the selected station as the destination
    return selectedStation;
  }, [selectedStation]);

  const trainTypes = useMemo(() => {
    // Use cached train types to avoid Apollo cache mutation issues
    const trainTypes =
      cachedTrainTypes.length > 0
        ? cachedTrainTypes
        : (routeTypesData?.routeTypes?.trainTypes ?? []);

    // Filter train types that are relevant to the current station's line
    if (!currentStationInRoutes?.line?.id) {
      return trainTypes;
    }

    // Filter train types that include the current station's line in their route
    return trainTypes.filter((tt) => {
      if (tt.line?.id === currentStationInRoutes.line?.id) {
        return true;
      }
      return (tt.lines ?? []).some(
        (l) => l.id === currentStationInRoutes.line?.id
      );
    });
  }, [cachedTrainTypes, routeTypesData, currentStationInRoutes?.line?.id]);

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
              loading={byNameLoading || mutateRouteTypesLoading}
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

      {station && (
        <NowHeader
          station={station}
          onLayout={(e) => setNowHeaderHeight(e.nativeEvent.layout.height)}
          scrollY={scrollY}
        />
      )}
      {/* フッター */}
      <FooterTabBar active="search" />

      <SelectBoundModal
        visible={selectBoundModalVisible}
        onClose={() => {
          // SelectBoundModalを閉じるだけで、選択状態はリセットしない
          // (TrainTypeListModalに戻れるようにする)
          setSelectBoundModalVisible(false);
        }}
        station={currentStationInRoutes}
        line={selectedLine}
        stations={
          stationsByLineGroupIdData?.lineGroupStations ??
          stationsByLineIdData?.lineStations ??
          []
        }
        trainType={selectedTrainType}
        destination={destinationInRoutes}
        loading={
          mutateStationsByLineIdStatus === 'pending' ||
          mutateStationsByLineGroupIdStatus === 'pending' ||
          mutateRouteTypesStatus === 'pending'
        }
        error={
          mutateStationsByLineIdError ??
          mutateStationsByLineGroupIdError ??
          mutateRouteTypesError ??
          null
        }
        onTrainTypeSelect={handleTrainTypeSelected}
      />
      <TrainTypeListModal
        visible={trainTypeListModalVisible}
        line={currentStationInRoutes?.line ?? null}
        trainTypes={trainTypes}
        destination={destinationInRoutes}
        onClose={() => {
          // キャンセル時のみリセット
          setSelectedLine(null);
          setSelectedStation(null);
          setSelectedTrainType(null);
          setCachedTrainTypes([]);
          setTrainTypeListModalVisible(false);
        }}
        onSelect={handleTrainTypeSelected}
        loading={
          mutateStationsByLineIdStatus === 'pending' ||
          mutateRouteTypesStatus === 'pending'
        }
      />
    </>
  );
};

export default React.memo(RouteSearchScreen);
