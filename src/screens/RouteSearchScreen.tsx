import { useMutation } from '@connectrpc/connect-query';
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
import { EmptyLineSeparator } from '~/components/EmptyLineSeparator';
import { EmptyResult } from '~/components/EmptyResult';
import FooterTabBar from '~/components/FooterTabBar';
import { Heading } from '~/components/Heading';
import { LineCard } from '~/components/LineCard';
import { NowHeader } from '~/components/NowHeader';
import { SearchBar } from '~/components/SearchBar';
import { SelectBoundModal } from '~/components/SelectBoundModal';
import { TrainTypeListModal } from '~/components/TrainTypeListModal';
import { type Line, Station, type TrainType } from '~/gen/proto/stationapi_pb';
import {
  getRoutes,
  getStationsByLineGroupId,
  getStationsByLineId,
  getStationsByName,
} from '~/gen/proto/stationapi-StationAPI_connectquery';
import { useThemeStore } from '../hooks';
import { APP_THEME } from '../models/Theme';
import stationState from '../store/atoms/station';
import { isJapanese, translate } from '../translation';

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

  const {
    data: routesData,
    mutate: mutateRoutes,
    status: mutateRoutesStatus,
    error: mutateRoutesError,
  } = useMutation(getRoutes);
  const {
    status: byNameLoadingStatus,
    mutateAsync: fetchByName,
    error: byNameError,
  } = useMutation(getStationsByName);
  const {
    data: stationsByLineIdData,
    mutate: mutateStationsByLineId,
    status: mutateStationsByLineIdStatus,
    error: mutateStationsByLineIdError,
  } = useMutation(getStationsByLineId);

  const {
    data: stationsByLineGroupIdData,
    mutate: mutateStationsByLineGroupId,
    status: mutateStationsByLineGroupIdStatus,
    error: mutateStationsByLineGroupIdError,
  } = useMutation(getStationsByLineGroupId);

  const handleSearch = useCallback(
    async (query: string) => {
      setSearchResults([]);

      if (!query.trim().length) {
        return [] as Station[];
      }
      const { stations } = await fetchByName({
        stationName: query.trim(),
        limit: Number(SEARCH_STATION_RESULT_LIMIT),
        fromStationGroupId: station?.groupId,
      });

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
        setTrainTypeListModalVisible(true);
        mutateRoutes({
          fromStationGroupId: station?.groupId,
          toStationGroupId: selectedStation.groupId,
        });
        return;
      }

      setSelectBoundModalVisible(true);

      mutateStationsByLineId({
        lineId: selectedStation.line?.id,
        stationId: selectedStation?.id,
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
          title={isJapanese ? item.name : (item.nameRoman ?? '')}
          subtitle={isJapanese ? line.nameShort : (line.nameRoman ?? '')}
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
        lineGroupId: trainType.groupId,
      });

      setTrainTypeListModalVisible(false);
      setSelectBoundModalVisible(true);
    },
    [mutateStationsByLineGroupId]
  );

  const keyExtractor = useCallback((s: Station) => s.id.toString(), []);
  const handleScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const currentStationInRoutes = useMemo<Station | null>(() => {
    if (!station || !selectedLine) return null;

    const notConnectedToOthersLine = station.lines.find(
      (l) => l.id === selectedLine.id
    );

    if (notConnectedToOthersLine) {
      return new Station({ ...station, line: notConnectedToOthersLine });
    }

    const currentIds = new Set(
      (station.lines ?? []).map((l) => l?.id).filter(Boolean)
    );
    const routeIdSet = new Set(
      (routesData?.routes ?? [])
        .map((r) => r.stops)
        .filter((stops) => stops.some((s) => s.line?.id === selectedLine.id))
        .flatMap((stops) => (stops ?? []).map((s) => s.line?.id))
        .filter(Boolean)
    );

    const commonIds = [...currentIds].filter((id) => routeIdSet.has(id));
    const commonLine = (station.lines ?? []).find((l) =>
      commonIds.includes(l.id)
    );

    if (!commonLine) return new Station({ ...station, line: selectedLine });

    return new Station({ ...station, line: commonLine });
  }, [station, selectedLine, routesData?.routes]);

  const destinationInRoutes = useMemo<Station | null>(() => {
    if (!selectedLine) return null;

    return (
      routesData?.routes
        .flatMap((r) => r.stops)
        .find((s) => s.id === selectedLine.station?.id) ?? null
    );
  }, [selectedLine, routesData?.routes]);

  const trainTypes = useMemo(
    () =>
      routesData?.routes
        .map(
          (r) =>
            r.stops.find(
              (rs) => rs.line?.id === currentStationInRoutes?.line?.id
            )?.trainType
        )
        .filter((tt): tt is TrainType => !!tt) ?? [],
    [routesData, currentStationInRoutes?.line?.id]
  );

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
          stationsByLineGroupIdData?.stations ??
          stationsByLineIdData?.stations ??
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
