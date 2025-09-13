import { useMutation } from '@connectrpc/connect-query';
import { useNavigation } from '@react-navigation/native';
import { useAtom, useSetAtom } from 'jotai';
import uniqWith from 'lodash/uniqWith';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, View } from 'react-native';
import { SEARCH_STATION_RESULT_LIMIT } from 'react-native-dotenv';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { EmptyLineSeparator } from '~/components/EmptyLineSeparator';
import FooterTabBar from '~/components/FooterTabBar';
import { Heading } from '~/components/Heading';
import { LineCard } from '~/components/LineCard';
import { NowHeader } from '~/components/NowHeader';
import { SearchBar } from '~/components/SearchBar';
import { SelectBoundModal } from '~/components/SelectBoundModal';
import { TrainTypeListModal } from '~/components/TrainTypeListModal';
import Typography from '~/components/Typography';
import { type Line, Station, type TrainType } from '~/gen/proto/stationapi_pb';
import {
  getRoutes,
  getStationsByLineGroupId,
  getStationsByLineId,
  getStationsByName,
} from '~/gen/proto/stationapi-StationAPI_connectquery';
import { useThemeStore } from '../hooks';
import { APP_THEME } from '../models/Theme';
import lineState from '../store/atoms/line';
import navigationState from '../store/atoms/navigation';
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
    textAlign: 'left',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  bold: { fontWeight: 'bold' },
});

type EmptyResultProps = {
  statuses: ('error' | 'idle' | 'pending' | 'success')[];
};

const EmptyResult = ({ statuses }: EmptyResultProps) => {
  if (statuses.every((s) => s === 'success')) {
    return (
      <Typography style={styles.bold}>
        {translate('emptySearchResult')}
      </Typography>
    );
  }

  if (statuses.includes('pending')) {
    return (
      <SkeletonPlaceholder borderRadius={4} speed={1500}>
        <SkeletonPlaceholder.Item width="100%" height={72} />
      </SkeletonPlaceholder>
    );
  }

  return null;
};

const RouteSearchScreen = () => {
  const [nowHeaderHeight, setNowHeaderHeight] = useState(0);
  const [selectBoundModalVisible, setSelectBoundModalVisible] = useState(false);
  const [trainTypeListModalVisible, setTrainTypeListModalVisible] =
    useState(false);
  const [selectedLine, setSelectedLine] = useState<Line | null>(null);
  const [searchResults, setSearchResults] = useState<Station[]>([]);

  const navigation = useNavigation();
  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED);

  const [{ station }, setStationState] = useAtom(stationState);
  const setLineState = useSetAtom(lineState);
  const setNavigationState = useSetAtom(navigationState);

  const scrollY = useSharedValue(0);

  const {
    data: routesData,
    mutate: mutateRoutes,
    status: fetchRoutesStatus,
    error: _fetchRoutesError,
  } = useMutation(getRoutes);
  const {
    status: byNameLoadingStatus,
    mutateAsync: fetchByName,
    error: byNameError,
  } = useMutation(getStationsByName);
  const {
    data: stationsByLineIdData,
    mutateAsync: fetchStationsByLineId,
    status: fetchStationsByLineIdStatus,
    error: fetchStationsByLineIdError,
  } = useMutation(getStationsByLineId);

  const {
    mutateAsync: fetchStationsByLineGroupId,
    status: _fetchStationsByLineGroupIdStatus,
    error: _fetchStationsByLineGroupIdError,
  } = useMutation(getStationsByLineGroupId);

  const matchedStations = useMemo<Station[]>(() => {
    return uniqWith(
      searchResults,
      (s1, s2) => s1.line?.id === s2.line?.id && s1.groupId === s2.groupId
    ).map((s) => new Station(s));
  }, [searchResults]);

  const handleSearch = useCallback(
    async (query: string) => {
      if (!query.trim().length) {
        return [] as Station[];
      }
      setSearchResults([]);
      const { stations } = await fetchByName({
        stationName: query.trim(),
        limit: Number(SEARCH_STATION_RESULT_LIMIT),
        fromStationGroupId: station?.groupId,
      });

      setSearchResults(stations);
    },
    [station?.groupId, fetchByName]
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
      await fetchStationsByLineId({
        lineId: selectedStation.line?.id,
        stationId: station?.id,
      });
    },
    [mutateRoutes, fetchStationsByLineId, station?.id, station?.groupId]
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
      if (!station) return;

      const stationsData = await fetchStationsByLineGroupId({
        lineGroupId: trainType.groupId,
      });
      const stations = stationsData.stations;

      const currentStationIndex = stations.findIndex(
        (s) => s.groupId === station?.groupId
      );
      const wantedStationIndex = stations.findIndex(
        (s) => s.groupId === selectedLine?.station?.groupId
      );
      const direction =
        currentStationIndex < wantedStationIndex ? 'INBOUND' : 'OUTBOUND';

      setLineState((prev) => ({
        ...prev,
        selectedLine: trainType.line ?? null,
      }));
      setStationState((prev) => ({
        ...prev,
        station,
        stations,
        selectedBound:
          direction === 'INBOUND' ? stations[stations.length - 1] : stations[0],
        selectedDirection: direction,
      }));
      setNavigationState((prev) => ({
        ...prev,
        trainType,
      }));

      setTrainTypeListModalVisible(false);

      requestAnimationFrame(() => {
        navigation.navigate('Main' as never);
      });
    },
    [
      setStationState,
      setLineState,
      setNavigationState,
      fetchStationsByLineGroupId,
      selectedLine?.station,
      station,
      navigation.navigate,
    ]
  );

  const keyExtractor = useCallback((s: Station) => s.id.toString(), []);
  const handleScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const trainTypes = useMemo(
    () =>
      routesData?.routes
        .map(
          (r) =>
            r.stops.find((rs) => rs.line?.id === selectedLine?.id)?.trainType
        )
        .filter((tt): tt is TrainType => !!tt) ?? [],
    [routesData, selectedLine?.id]
  );

  return (
    <>
      <SafeAreaView style={[styles.root, !isLEDTheme && styles.nonLEDBg]}>
        <Animated.FlatList<Station>
          style={StyleSheet.absoluteFill}
          data={matchedStations}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ItemSeparatorComponent={EmptyLineSeparator}
          ListEmptyComponent={
            <EmptyResult statuses={[byNameLoadingStatus, fetchRoutesStatus]} />
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
        station={
          stationsByLineIdData?.stations.find(
            (s) => s.groupId === station?.groupId
          ) ?? null
        }
        line={selectedLine}
        stations={stationsByLineIdData?.stations ?? []}
        trainType={null}
        destination={selectedLine?.station ?? null}
        loading={fetchStationsByLineIdStatus === 'pending'}
        error={fetchStationsByLineIdError ?? null}
      />
      <TrainTypeListModal
        visible={trainTypeListModalVisible}
        line={selectedLine}
        trainTypes={trainTypes}
        destination={selectedLine?.station}
        onClose={() => {
          setSelectedLine(null);
          setTrainTypeListModalVisible(false);
        }}
        onSelect={handleTrainTypeSelected}
        loading={fetchRoutesStatus === 'pending'}
      />
    </>
  );
};

export default React.memo(RouteSearchScreen);
