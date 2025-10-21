import { useLazyQuery } from '@apollo/client/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Effect, pipe } from 'effect';
import * as Location from 'expo-location';
import * as ScreenOrientation from 'expo-screen-orientation';
import findNearest from 'geolib/es/findNearest';
import { useAtom, useSetAtom } from 'jotai';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import type { Line, Station, TrainType } from '~/@types/graphql';
import { EmptyLineSeparator } from '~/components/EmptyLineSeparator';
import { NowHeader } from '~/components/NowHeader';
import { SelectBoundModal } from '~/components/SelectBoundModal';
import {
  GET_LINE_GROUP_STATIONS,
  GET_LINE_STATIONS,
  GET_STATION_TRAIN_TYPES,
} from '~/lib/graphql/queries';
import type { SavedRoute } from '~/models/SavedRoute';
import FooterTabBar, { FOOTER_BASE_HEIGHT } from '../components/FooterTabBar';
import { Heading } from '../components/Heading';
import { LineCard } from '../components/LineCard';
import { ASYNC_STORAGE_KEYS, LOCATION_TASK_NAME } from '../constants';
import {
  useFetchCurrentLocationOnce,
  useFetchNearbyStation,
  useLocationStore,
  useThemeStore,
} from '../hooks';
import { useSavedRoutes } from '../hooks/useSavedRoutes';
import { APP_THEME } from '../models/Theme';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { isJapanese, translate } from '../translation';
import { generateLineTestId } from '../utils/generateTestID';
import { SelectLineScreenPresets } from './SelectLineScreenPresets';

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

type GetStationTrainTypesData = {
  stationTrainTypes: TrainType[];
};

type GetStationTrainTypesVariables = {
  stationId: number;
};

export type LoopItem = (SavedRoute & { stations: Station[] }) & {
  __k: string;
};

const styles = StyleSheet.create({
  root: { paddingHorizontal: 24, flex: 1 },
  listContainerStyle: { paddingBottom: 24, paddingHorizontal: 24 },
  lineName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  screenBg: {
    backgroundColor: '#FAFAFA',
  },
});

type ListHeaderProps = {
  headingTitle: string;
  carouselData: LoopItem[];
  isPresetsLoading: boolean;
  onPress: (route: SavedRoute) => void;
};

const ListHeader = React.memo(
  ({
    headingTitle,
    carouselData,
    isPresetsLoading,
    onPress,
  }: ListHeaderProps) => (
    <>
      <SelectLineScreenPresets
        carouselData={carouselData}
        isPresetsLoading={isPresetsLoading}
        onPress={onPress}
      />
      <Heading style={styles.heading}>{headingTitle}</Heading>
    </>
  )
);

const NearbyStationLoader = () => (
  <SkeletonPlaceholder borderRadius={4} speed={1500}>
    <SkeletonPlaceholder.Item width="100%" height={72} />
  </SkeletonPlaceholder>
);

const SelectLineScreen = () => {
  const [{ station: stationFromAtom }, setStationState] = useAtom(stationState);
  const setNavigationState = useSetAtom(navigationState);
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);

  const latitude = useLocationStore((state) => state?.coords.latitude);
  const longitude = useLocationStore((state) => state?.coords.longitude);
  const footerHeight = FOOTER_BASE_HEIGHT + Math.max(insets.bottom, 8);
  const listPaddingBottom = useMemo(() => {
    const flattened = StyleSheet.flatten(styles.listContainerStyle) as {
      paddingBottom?: number;
    };
    return (flattened?.paddingBottom ?? 24) + footerHeight;
  }, [footerHeight]);

  const isLEDTheme = useThemeStore((s) => s === APP_THEME.LED);

  const {
    stations: nearbyStations,
    fetchByCoords,
    isLoading: nearbyStationLoading,
    error: nearbyStationFetchError,
  } = useFetchNearbyStation();
  const station = useMemo(
    () => stationFromAtom ?? nearbyStations[0] ?? null,
    [stationFromAtom, nearbyStations[0]]
  );

  const { fetchCurrentLocation } = useFetchCurrentLocationOnce();
  const {
    routes,
    updateRoutes,
    isInitialized: isRoutesDBInitialized,
  } = useSavedRoutes();
  const [stationsCache, setStationsCache] = useState<Station[][]>([]);
  const [carouselData, setCarouselData] = useState<LoopItem[]>([]);
  const [nowHeaderHeight, setNowHeaderHeight] = useState(0);
  // SavedRouteモーダル用の状態
  const [isSelectBoundModalOpen, setIsSelectBoundModalOpen] = useState(false);
  // 確定時にのみ反映するための一時保存データ
  const pendingStationRef = useRef<Station | null>(null);
  const pendingLineRef = useRef<Line | null>(null);
  const pendingWantedDestinationRef = useRef<Station | null>(null);

  const [pendingStations, setPendingStations] = useState<Station[]>([]);
  const [pendingTrainType, setPendingTrainType] = useState<TrainType | null>(
    null
  );

  const [
    fetchStationsByLineId,
    {
      loading: fetchStationsByLineIdLoading,
      error: _fetchStationsByLineIdError,
    },
  ] = useLazyQuery<GetLineStationsData, GetLineStationsVariables>(
    GET_LINE_STATIONS
  );
  const [
    fetchStationsByLineGroupId,
    {
      loading: fetchStationsByLineGroupIdLoading,
      error: _fetchStationsByLineGroupIdError,
    },
  ] = useLazyQuery<GetLineGroupStationsData, GetLineGroupStationsVariables>(
    GET_LINE_GROUP_STATIONS
  );
  const [
    fetchTrainTypes,
    { loading: fetchTrainTypesLoading, error: fetchTrainTypesError },
  ] = useLazyQuery<GetStationTrainTypesData, GetStationTrainTypesVariables>(
    GET_STATION_TRAIN_TYPES
  );

  const fetchStationsByLineIdStatus = fetchStationsByLineIdLoading
    ? 'pending'
    : 'success';
  const fetchStationsByLineGroupIdStatus = fetchStationsByLineGroupIdLoading
    ? 'pending'
    : 'success';
  const fetchTrainTypesStatus = fetchTrainTypesLoading ? 'pending' : 'success';

  useEffect(() => {
    ScreenOrientation.unlockAsync().catch(console.error);
  }, []);

  useEffect(() => {
    if (!isRoutesDBInitialized) return;
    updateRoutes();
  }, [isRoutesDBInitialized, updateRoutes]);

  useEffect(() => {
    const fetchAsync = async () => {
      try {
        const routeStations: Array<SavedRoute & { stations: Station[] }> = [];

        for (const route of routes) {
          if (route.hasTrainType) {
            const result = await fetchStationsByLineGroupId({
              variables: {
                lineGroupId: route.trainTypeId,
              },
            });
            routeStations.push({
              ...route,
              stations: result.data?.lineGroupStations ?? [],
            });
            continue;
          }

          const result = await fetchStationsByLineId({
            variables: {
              lineId: route.lineId,
            },
          });
          routeStations.push({
            ...route,
            stations: result.data?.lineStations ?? [],
          });
        }

        setCarouselData(
          routes.map((r) => ({
            ...r,
            __k: '', // loop用のキー（実際にはloopDataで付与されるのでここでは空文字でよい）
            stations:
              routeStations.find((rs) => rs.id === r.id)?.stations ?? [],
          }))
        );
      } catch (err) {
        console.error(err);
      }
    };
    fetchAsync();
  }, [routes, fetchStationsByLineId, fetchStationsByLineGroupId]);

  useEffect(() => {
    const fetchStationsAsync = async () => {
      const lines = station?.lines ?? [];
      const validLines = lines.filter((line) => line.id != null);
      const stations: Station[][] = [];

      for (const line of validLines) {
        const result = await fetchStationsByLineId({
          variables: {
            lineId: line.id as number,
            stationId: line.station?.id ?? undefined,
          },
        });

        stations.push(result.data?.lineStations ?? []);
      }
      setStationsCache(stations);
    };

    fetchStationsAsync();
  }, [station?.lines, fetchStationsByLineId]);

  useEffect(() => {
    pipe(
      Effect.promise(() =>
        Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)
      ),
      Effect.andThen((hasStartedLocationUpdates) => {
        if (hasStartedLocationUpdates) {
          return Effect.promise(() =>
            Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
          );
        }
      }),
      Effect.runPromise
    );
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 初回のみ
  useEffect(() => {
    const fetchInitialNearbyStationAsync = async () => {
      const location = await fetchCurrentLocation(true);
      if (!location) return;
      useLocationStore.setState(location);
      const data = await fetchByCoords({
        variables: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          limit: 1,
        },
      });
      const stationFromAPI = data.data?.stationsNearby[0] ?? null;
      setStationState((prev) => ({
        ...prev,
        station: prev.station ?? stationFromAPI,
      }));
      setNavigationState((prev) => ({
        ...prev,
        stationForHeader: stationFromAPI,
      }));

      const stationLines = stationFromAPI?.lines ?? [];

      const stations: Station[][] = [];

      for (const line of stationLines) {
        try {
          const result = await fetchStationsByLineId({
            variables: {
              lineId: line.id as number,
              stationId: line.station?.id ?? undefined,
            },
          });

          stations.push(result.data?.lineStations ?? []);
        } catch (error) {
          console.error(error);
          stations.push([]);
        }
      }

      setStationsCache(stations);
    };
    fetchInitialNearbyStationAsync();
  }, []);

  useEffect(() => {
    pipe(
      Effect.promise(() =>
        AsyncStorage.getItem(ASYNC_STORAGE_KEYS.FIRST_LAUNCH_PASSED)
      ),
      Effect.andThen((firstLaunchPassed) => {
        if (firstLaunchPassed === null) {
          Alert.alert(translate('notice'), translate('firstAlertText'), [
            {
              text: 'OK',
              onPress: (): void => {
                AsyncStorage.setItem(
                  ASYNC_STORAGE_KEYS.FIRST_LAUNCH_PASSED,
                  'true'
                );
              },
            },
          ]);
        }
      }),
      Effect.runPromise
    );
  }, []);

  useEffect(() => {
    if (nearbyStationFetchError) {
      Alert.alert(translate('errorTitle'), translate('apiErrorText'));
    }
  }, [nearbyStationFetchError]);

  const handleLineSelected = useCallback(
    async (line: Line, index: number) => {
      const stations = stationsCache[index] ?? [];
      pendingLineRef.current = line ?? null;
      pendingStationRef.current = line.station ?? null;
      setPendingStations(stations);
      setIsSelectBoundModalOpen(true);

      if (line.station?.hasTrainTypes && line.station?.id != null) {
        const result = await fetchTrainTypes({
          variables: {
            stationId: line.station.id,
          },
        });
        const trainTypes = result.data?.stationTrainTypes ?? [];
        const trainType =
          trainTypes.find(
            (tt: TrainType) =>
              tt.groupId ===
              stations.find((s) => s.line?.id === line.id)?.trainType?.groupId
          ) ?? null;
        setPendingTrainType(trainType);
        setNavigationState((prev) => ({
          ...prev,
          fetchedTrainTypes: trainTypes,
        }));
      }
    },
    [fetchTrainTypes, setNavigationState, stationsCache]
  );

  const handleTrainTypeSelect = useCallback(
    async (trainType: TrainType) => {
      if (trainType.groupId == null) return;
      const res = await fetchStationsByLineGroupId({
        variables: {
          lineGroupId: trainType.groupId,
        },
      });
      setPendingTrainType(trainType);
      setPendingStations(res.data?.lineGroupStations ?? []);
    },
    [fetchStationsByLineGroupId]
  );

  // PresetCard押下時のモーダル表示ロジック（SavedRoutesScreenのhandleItemPress相当）
  const openModalByLineId = useCallback(
    async (lineId: number, destinationStationId: number | null) => {
      // try cache first
      const result = await fetchStationsByLineId({
        variables: { lineId },
      });
      const stations = result.data?.lineStations ?? [];
      if (!stations.length) return;

      const wantedDestination =
        stations.find((sta: Station) => sta.groupId === destinationStationId) ??
        null;

      // Filter stations with valid coordinates
      const stationsWithCoords = stations.filter(
        (sta: Station) => sta.latitude != null && sta.longitude != null
      );

      if (!stationsWithCoords.length) {
        // No stations have coordinates, cannot determine nearest
        return;
      }

      // Determine reference coordinates: user location or first station with coords
      const referenceCoords =
        latitude != null && longitude != null
          ? { latitude, longitude }
          : {
              latitude: stationsWithCoords[0].latitude as number,
              longitude: stationsWithCoords[0].longitude as number,
            };

      const nearestCoordinates = findNearest(
        referenceCoords,
        stationsWithCoords.map((sta: Station) => ({
          latitude: sta.latitude as number,
          longitude: sta.longitude as number,
        }))
      ) as { latitude: number; longitude: number };

      const station = stations.find(
        (sta: Station) =>
          sta.latitude === nearestCoordinates.latitude &&
          sta.longitude === nearestCoordinates.longitude
      );

      if (!station) return;

      // モーダル表示用のローカル状態のみ更新（グローバルは確定時に反映）
      pendingStationRef.current = station;
      setPendingStations(stations);
      setPendingTrainType(null);
      pendingLineRef.current = (station.line as Line) ?? null;
      pendingWantedDestinationRef.current = wantedDestination;
    },
    [fetchStationsByLineId, latitude, longitude]
  );

  const openModalByTrainTypeId = useCallback(
    async (lineGroupId: number, destinationStationId: number | null) => {
      const result = await fetchStationsByLineGroupId({
        variables: { lineGroupId },
      });
      const stations = result.data?.lineGroupStations ?? [];
      if (!stations.length) return;

      const wantedDestination =
        stations.find((sta: Station) => sta.groupId === destinationStationId) ??
        null;

      // Filter stations with valid coordinates
      const stationsWithCoords = stations.filter(
        (sta: Station) => sta.latitude != null && sta.longitude != null
      );

      if (!stationsWithCoords.length) {
        // No stations have coordinates, cannot determine nearest
        return;
      }

      // Determine reference coordinates: user location or first station with coords
      const referenceCoords =
        latitude != null && longitude != null
          ? { latitude, longitude }
          : {
              latitude: stationsWithCoords[0].latitude as number,
              longitude: stationsWithCoords[0].longitude as number,
            };

      const nearestCoordinates = findNearest(
        referenceCoords,
        stationsWithCoords.map((sta: Station) => ({
          latitude: sta.latitude as number,
          longitude: sta.longitude as number,
        }))
      ) as { latitude: number; longitude: number };

      const station = stations.find(
        (sta: Station) =>
          sta.latitude === nearestCoordinates.latitude &&
          sta.longitude === nearestCoordinates.longitude
      );

      if (!station) return;

      // モーダル表示用のローカル状態のみ更新（グローバルは確定時に反映）
      pendingStationRef.current = station;
      setPendingStations(stations);
      pendingLineRef.current = station?.line ?? null;
      pendingWantedDestinationRef.current = wantedDestination;

      if (station?.hasTrainTypes && station?.id != null) {
        const result = await fetchTrainTypes({
          variables: {
            stationId: station.id,
          },
        });
        const trainTypes = result.data?.stationTrainTypes ?? [];

        const trainType =
          trainTypes.find(
            (tt: TrainType) => tt.groupId === station.trainType?.groupId
          ) ?? null;
        setPendingTrainType(trainType);
        setNavigationState((prev) => ({
          ...prev,
          fetchedTrainTypes: trainTypes,
        }));
      }
    },
    [
      fetchStationsByLineGroupId,
      fetchTrainTypes,
      setNavigationState,
      latitude,
      longitude,
    ]
  );

  const handlePresetPress = useCallback(
    async (route: SavedRoute) => {
      setIsSelectBoundModalOpen(true);
      if (route.hasTrainType) {
        await openModalByTrainTypeId(
          route.trainTypeId,
          route.destinationStationId ?? null
        );
      } else {
        await openModalByLineId(
          route.lineId,
          route.destinationStationId ?? null
        );
      }
    },
    [openModalByLineId, openModalByTrainTypeId]
  );

  const handleCloseSelectBoundModal = useCallback(() => {
    setIsSelectBoundModalOpen(false);
    pendingStationRef.current = null;
    setPendingStations([]);
    setPendingTrainType(null);
    pendingLineRef.current = null;
    pendingWantedDestinationRef.current = null;
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: Line; index: number }) => {
      const stations = stationsCache[index];
      if (!stations || fetchStationsByLineIdStatus === 'pending') {
        return (
          <SkeletonPlaceholder borderRadius={4} speed={1500}>
            <SkeletonPlaceholder.Item width="100%" height={72} />
          </SkeletonPlaceholder>
        );
      }

      return (
        <LineCard
          line={item}
          onPress={() => handleLineSelected(item, index)}
          stations={stations}
          testID={generateLineTestId(item)}
        />
      );
    },
    [handleLineSelected, fetchStationsByLineIdStatus, stationsCache]
  );

  const keyExtractor = useCallback(
    (l: Line, index: number) =>
      l.id !== null && l.id !== undefined ? String(l.id) : `tmp-${index}`,
    []
  );

  const headingTitle = useMemo(() => {
    if (!station) return translate('selectLineTitle');
    const re = /\([^()]*\)/g;
    const baseNameJa = (station.name ?? '').replace(re, '');
    const baseNameEn = (station.nameRoman ?? station.name ?? '').replace(
      re,
      ''
    );
    return isJapanese ? `${baseNameJa}駅の路線` : baseNameEn;
  }, [station]);

  const handleScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const isPresetsLoading = useMemo(
    () =>
      !isRoutesDBInitialized ||
      fetchStationsByLineIdStatus === 'pending' ||
      fetchStationsByLineGroupIdStatus === 'pending',
    [
      isRoutesDBInitialized,
      fetchStationsByLineIdStatus,
      fetchStationsByLineGroupIdStatus,
    ]
  );

  return (
    <>
      <SafeAreaView style={[styles.root, !isLEDTheme && styles.screenBg]}>
        <Animated.FlatList
          style={StyleSheet.absoluteFill}
          data={station?.lines ?? []}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ItemSeparatorComponent={EmptyLineSeparator}
          ListEmptyComponent={nearbyStationLoading ? NearbyStationLoader : null}
          ListHeaderComponent={
            <ListHeader
              headingTitle={headingTitle}
              carouselData={carouselData}
              isPresetsLoading={isPresetsLoading}
              onPress={handlePresetPress}
            />
          }
          ListFooterComponent={EmptyLineSeparator}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[
            styles.listContainerStyle,
            nowHeaderHeight ? { paddingTop: nowHeaderHeight } : null,
            { paddingBottom: listPaddingBottom },
          ]}
        />
      </SafeAreaView>
      {/* 固定ヘッダー */}
      <NowHeader
        station={stationFromAtom ?? station}
        onLayout={(e) => setNowHeaderHeight(e.nativeEvent.layout.height + 32)}
        scrollY={scrollY}
      />

      {/* フッター */}
      <FooterTabBar active="home" />
      {/* モーダル */}
      <SelectBoundModal
        visible={isSelectBoundModalOpen}
        onClose={handleCloseSelectBoundModal}
        station={pendingStationRef.current}
        stations={pendingStations}
        trainType={pendingTrainType}
        line={pendingLineRef.current}
        destination={pendingWantedDestinationRef.current}
        loading={fetchTrainTypesStatus === 'pending'}
        error={fetchTrainTypesError ?? null}
        onTrainTypeSelect={handleTrainTypeSelect}
      />
    </>
  );
};

export default React.memo(SelectLineScreen);
