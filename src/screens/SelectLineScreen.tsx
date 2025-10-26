import { useLazyQuery } from '@apollo/client/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Effect, pipe } from 'effect';
import * as Location from 'expo-location';
import * as ScreenOrientation from 'expo-screen-orientation';
import findNearest from 'geolib/es/findNearest';
import { useAtom, useSetAtom } from 'jotai';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import lineStateAtom from '../store/atoms/line';
import navigationState, { type LoopItem } from '../store/atoms/navigation';
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
  const [nowHeaderHeight, setNowHeaderHeight] = useState(0);
  const [carouselData, setCarouselData] = useState<LoopItem[]>([]);
  const [isSelectBoundModalOpen, setIsSelectBoundModalOpen] = useState(false);

  const [stationAtomState, setStationState] = useAtom(stationState);
  const [, setLineState] = useAtom(lineStateAtom);
  const {
    station: stationFromAtom,
    stationsCache,
    selectedBound,
  } = stationAtomState;
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
    [stationFromAtom, nearbyStations]
  );

  const stationLines = useMemo<Line[]>(() => {
    return (station?.lines ?? []).filter((line) => Boolean(line));
  }, [station?.lines]);

  const { fetchCurrentLocation } = useFetchCurrentLocationOnce();
  const {
    routes,
    updateRoutes,
    isInitialized: isRoutesDBInitialized,
  } = useSavedRoutes();

  const [fetchStationsByLineId, { loading: fetchStationsByLineIdLoading }] =
    useLazyQuery<GetLineStationsData, GetLineStationsVariables>(
      GET_LINE_STATIONS
    );
  const [
    fetchStationsByLineGroupId,
    { loading: fetchStationsByLineGroupIdLoading },
  ] = useLazyQuery<GetLineGroupStationsData, GetLineGroupStationsVariables>(
    GET_LINE_GROUP_STATIONS
  );
  const [
    fetchTrainTypes,
    { loading: fetchTrainTypesLoading, error: fetchTrainTypesError },
  ] = useLazyQuery<GetStationTrainTypesData, GetStationTrainTypesVariables>(
    GET_STATION_TRAIN_TYPES
  );

  useEffect(() => {
    ScreenOrientation.unlockAsync().catch(console.error);
  }, []);

  useEffect(() => {
    if (!isRoutesDBInitialized || !!selectedBound) return;
    updateRoutes();
  }, [isRoutesDBInitialized, updateRoutes, selectedBound]);

  useEffect(() => {
    const fetchAsync = async () => {
      if (selectedBound) {
        return;
      }

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
  }, [
    routes,
    fetchStationsByLineId,
    fetchStationsByLineGroupId,
    selectedBound,
  ]);

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

  useEffect(() => {
    const fetchInitialNearbyStationAsync = async () => {
      if (selectedBound) {
        return;
      }

      const location = await fetchCurrentLocation(true);
      if (!location) return;
      useLocationStore.setState(location);
      const data = await fetchByCoords({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        limit: 1,
      });
      const stationFromAPI = data.data?.stationsNearby[0] ?? null;
      setStationState((prev) => ({
        ...prev,
        station: stationFromAPI,
      }));
      setNavigationState((prev) => ({
        ...prev,
        stationForHeader: stationFromAPI,
      }));

      const stations: Station[][] = [];
      const fetchedLines = (stationFromAPI?.lines ?? []).filter((line) =>
        Boolean(line)
      );

      for (const line of fetchedLines) {
        const lineId = line.id;
        if (!lineId) {
          stations.push([]);
          continue;
        }

        try {
          const result = await fetchStationsByLineId({
            variables: {
              lineId,
            },
          });
          stations.push(result.data?.lineStations ?? []);
        } catch (error) {
          console.error(error);
          stations.push([]);
        }
      }

      setStationState((prev) => ({
        ...prev,
        stationsCache: stations,
      }));
    };
    fetchInitialNearbyStationAsync();
  }, [
    fetchByCoords,
    fetchCurrentLocation,
    fetchStationsByLineId,
    setNavigationState,
    setStationState,
    selectedBound,
  ]);

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
      console.error(nearbyStationFetchError);
      Alert.alert(translate('errorTitle'), translate('apiErrorText'));
    }
  }, [nearbyStationFetchError]);

  const handleLineSelected = useCallback(
    async (line: Line) => {
      setIsSelectBoundModalOpen(true);

      const lineId = line.id;
      const lineStationId = line.station?.id;
      if (!lineId || !lineStationId) return;

      const result = await fetchStationsByLineId({
        variables: { lineId, stationId: lineStationId },
      });
      const pendingStations = result.data?.lineStations ?? [];

      const pendingStation =
        pendingStations.find((s) => s.id === line.station?.id) ?? null;

      setStationState((prev) => ({
        ...prev,
        pendingStation,
        pendingStations,
      }));
      setLineState((prev) => ({
        ...prev,
        pendingLine: line ?? null,
      }));
      setNavigationState((prev) => ({
        ...prev,
        fetchedTrainTypes: [],
        trainType: null,
      }));

      if (line.station?.hasTrainTypes && line.station?.id != null) {
        const result = await fetchTrainTypes({
          variables: {
            stationId: line.station.id,
          },
        });
        const fetchedTrainTypes = result.data?.stationTrainTypes ?? [];
        const designatedTrainTypeId =
          pendingStations.find((s) => s.id === line?.station?.id)?.trainType
            ?.id ?? null;
        const designatedTrainType =
          fetchedTrainTypes.find((tt) => tt.id === designatedTrainTypeId) ??
          null;
        setNavigationState((prev) => ({
          ...prev,
          fetchedTrainTypes,
          trainType: designatedTrainType as TrainType | null,
        }));
      }
    },
    [
      fetchTrainTypes,
      setNavigationState,
      setStationState,
      setLineState,
      fetchStationsByLineId,
    ]
  );

  const handleTrainTypeSelect = useCallback(
    async (trainType: TrainType) => {
      if (trainType.groupId == null) return;
      const res = await fetchStationsByLineGroupId({
        variables: {
          lineGroupId: trainType.groupId,
        },
      });
      setStationState((prev) => ({
        ...prev,
        pendingStations: res.data?.lineGroupStations ?? [],
      }));
      setNavigationState((prev) => ({
        ...prev,
        trainType,
      }));
    },
    [fetchStationsByLineGroupId, setStationState, setNavigationState]
  );

  // PresetCard押下時のモーダル表示ロジック
  const openModalByLineId = useCallback(
    async (lineId: number, destinationStationId: number | null) => {
      // try cache first
      const result = await fetchStationsByLineId({
        variables: { lineId, stationId: destinationStationId ?? undefined },
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

      setStationState((prev) => ({
        ...prev,
        pendingStation: station,
        pendingStations: stations,
      }));
      setLineState((prev) => ({
        ...prev,
        pendingLine: (station.line as Line) ?? null,
      }));
      setNavigationState((prev) => ({
        ...prev,
        pendingWantedDestination: wantedDestination,
      }));
    },
    [
      fetchStationsByLineId,
      latitude,
      longitude,
      setNavigationState,
      setStationState,
      setLineState,
    ]
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
      setStationState((prev) => ({
        ...prev,
        pendingStation: station,
        pendingStations: stations,
      }));
      setLineState((prev) => ({
        ...prev,
        pendingLine: station?.line ?? null,
      }));
      setNavigationState((prev) => ({
        ...prev,
        pendingWantedDestination: wantedDestination,
      }));

      if (station?.hasTrainTypes && station?.id != null) {
        const result = await fetchTrainTypes({
          variables: {
            stationId: station.id,
          },
        });
        const trainTypes = result.data?.stationTrainTypes ?? [];

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
      setStationState,
      setLineState,
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
    setStationState((prev) => ({
      ...prev,
      pendingStation: null,
      pendingStations: [],
    }));
    setLineState((prev) => ({
      ...prev,
      pendingLine: null,
    }));
  }, [setLineState, setStationState]);

  const renderItem = useCallback(
    ({ item, index }: { item: Line; index: number }) => {
      const stations = stationsCache[index];
      if (!stations || fetchStationsByLineIdLoading) {
        return (
          <SkeletonPlaceholder borderRadius={4} speed={1500}>
            <SkeletonPlaceholder.Item width="100%" height={72} />
          </SkeletonPlaceholder>
        );
      }

      return (
        <LineCard
          line={item}
          onPress={() => handleLineSelected(item)}
          stations={stations}
          testID={generateLineTestId(item)}
        />
      );
    },
    [handleLineSelected, fetchStationsByLineIdLoading, stationsCache]
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
      fetchStationsByLineIdLoading ||
      fetchStationsByLineGroupIdLoading,
    [
      isRoutesDBInitialized,
      fetchStationsByLineIdLoading,
      fetchStationsByLineGroupIdLoading,
    ]
  );

  return (
    <>
      <SafeAreaView style={[styles.root, !isLEDTheme && styles.screenBg]}>
        <Animated.FlatList
          style={StyleSheet.absoluteFill}
          data={stationLines}
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
        station={stationFromAtom}
        onLayout={(e) => setNowHeaderHeight(e.nativeEvent.layout.height + 32)}
        scrollY={scrollY}
      />

      {/* フッター */}
      <FooterTabBar active="home" />
      {/* モーダル */}
      <SelectBoundModal
        visible={isSelectBoundModalOpen}
        onClose={handleCloseSelectBoundModal}
        loading={
          fetchTrainTypesLoading ||
          fetchStationsByLineIdLoading ||
          fetchStationsByLineGroupIdLoading
        }
        error={fetchTrainTypesError ?? null}
        onTrainTypeSelect={handleTrainTypeSelect}
      />
    </>
  );
};

export default React.memo(SelectLineScreen);
