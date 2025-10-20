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
  GET_ROUTES,
  GET_STATIONS_BY_NAME,
} from '~/lib/graphql/queries';
import { useThemeStore } from '../hooks';
import { APP_THEME } from '../models/Theme';
import stationState from '../store/atoms/station';
import { isJapanese, translate } from '../translation';

type GetRoutesData = {
  routes: {
    nextPageToken: string | null;
    routes: {
      id: string;
      stops: Station[];
    }[];
  };
};

type GetRoutesVariables = {
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
  const [searchResults, setSearchResults] = useState<Station[]>([]);
  const [selectedTrainType, setSelectedTrainType] = useState<TrainType | null>(
    null
  );

  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED);

  const { station } = useAtomValue(stationState);

  const scrollY = useSharedValue(0);

  const [
    mutateRoutes,
    {
      data: routesData,
      loading: mutateRoutesLoading,
      error: mutateRoutesError,
    },
  ] = useLazyQuery<GetRoutesData, GetRoutesVariables>(GET_ROUTES);

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

  const mutateRoutesStatus = mutateRoutesLoading ? 'pending' : 'success';
  const byNameLoadingStatus = byNameLoading ? 'pending' : 'success';
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
        return [] as Station[];
      }
      const result = await fetchByName({
        variables: {
          name: query.trim(),
          limit: Number(SEARCH_STATION_RESULT_LIMIT),
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
      setSelectedLine(selectedStation.line ?? null);

      if (selectedStation.hasTrainTypes) {
        // Guard: ensure both groupIds are present before calling the query
        if (!station?.groupId || !selectedStation.groupId) {
          return;
        }
        setTrainTypeListModalVisible(true);
        mutateRoutes({
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
    [mutateRoutes, mutateStationsByLineId, station?.groupId]
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
      setSelectedTrainType(trainType);
      mutateStationsByLineGroupId({
        variables: {
          lineGroupId: trainType.groupId ?? 0,
        },
      });

      setTrainTypeListModalVisible(false);
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
    const routes = routesData?.routes?.routes ?? [];
    const routeIdSet = new Set(
      routes
        .map((r: { id: string; stops: Station[] }) => r.stops)
        .filter((stops: Station[]) =>
          stops.some((s: Station) => s.line?.id === selectedLine.id)
        )
        .flatMap((stops: Station[]) =>
          (stops ?? []).map((s: Station) => s.line?.id)
        )
        .filter(Boolean)
    );

    const commonIds = [...currentIds].filter((id) => routeIdSet.has(id));
    const commonLine = (station.lines ?? []).find((l) =>
      commonIds.includes(l.id)
    );

    if (!commonLine) return { ...station, line: selectedLine } as Station;

    return { ...station, line: commonLine } as Station;
  }, [station, selectedLine, routesData?.routes]);

  const destinationInRoutes = useMemo<Station | null>(() => {
    if (!selectedLine) return null;
    const routes = routesData?.routes?.routes ?? [];

    return (
      routes
        .flatMap((r: { id: string; stops: Station[] }) => r.stops)
        .find((s: Station) => s.id === selectedLine.station?.id) ?? null
    );
  }, [selectedLine, routesData?.routes]);

  const trainTypes = useMemo(() => {
    const routes = routesData?.routes?.routes ?? [];
    return routes
      .map(
        (r: { id: string; stops: Station[] }) =>
          r.stops.find(
            (rs: Station) => rs.line?.id === currentStationInRoutes?.line?.id
          )?.trainType
      )
      .filter((tt: TrainType | null | undefined): tt is TrainType => !!tt);
  }, [routesData, currentStationInRoutes?.line?.id]);

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
            <EmptyResult statuses={[byNameLoadingStatus, mutateRoutesStatus]} />
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
        onClose={() => setSelectBoundModalVisible(false)}
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
          mutateRoutesStatus === 'pending'
        }
        error={
          mutateStationsByLineIdError ??
          mutateStationsByLineGroupIdError ??
          mutateRoutesError ??
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
          setSelectedLine(null);
          setTrainTypeListModalVisible(false);
        }}
        onSelect={handleTrainTypeSelected}
        loading={
          mutateStationsByLineIdStatus === 'pending' ||
          mutateRoutesStatus === 'pending'
        }
      />
    </>
  );
};

export default React.memo(RouteSearchScreen);
