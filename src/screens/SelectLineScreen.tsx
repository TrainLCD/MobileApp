import { useMutation } from '@connectrpc/connect-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
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
import { EmptyLineSeparator } from '~/components/EmptyLineSeparator';
import { NowHeader } from '~/components/NowHeader';
import { SelectBoundModal } from '~/components/SelectBoundModal';
import type { Line, Station, TrainType } from '~/gen/proto/stationapi_pb';
import {
  getStationsByLineGroupId,
  getStationsByLineId,
  getTrainTypesByStationId,
} from '~/gen/proto/stationapi-StationAPI_connectquery';
import type { SavedRoute } from '~/models/SavedRoute';
import ErrorScreen from '../components/ErrorScreen';
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
    textAlign: 'left',
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
  const lineStationsByIdMap = useRef<Map<number, Station[]>>(new Map()).current;
  const [carouselData, setCarouselData] = useState<LoopItem[]>([]);
  const [nowHeaderHeight, setNowHeaderHeight] = useState(0);
  // SavedRouteモーダル用の状態
  const [isSelectBoundModalOpen, setIsSelectBoundModalOpen] = useState(false);
  // 確定時にのみ反映するための一時保存データ
  const pendingStationRef = useRef<Station | null>(null);
  const pendingStationsRef = useRef<Station[] | null>(null);
  const pendingTrainTypeRef = useRef<TrainType | null>(null);
  const pendingLineRef = useRef<Line | null>(null);
  const pendingWantedDestinationRef = useRef<Station | null>(null);

  const {
    mutateAsync: fetchStationsByLineId,
    status: fetchStationsByLineIdStatus,
    error: _fetchStationsByLineIdError,
  } = useMutation(getStationsByLineId);
  const {
    mutateAsync: fetchStationsByLineGroupId,
    status: fetchStationsByLineGroupIdStatus,
    error: _fetchStationsByLineGroupIdError,
  } = useMutation(getStationsByLineGroupId);
  const {
    mutateAsync: fetchTrainTypes,
    status: fetchTrainTypesStatus,
    error: fetchTrainTypesError,
  } = useMutation(getTrainTypesByStationId);

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
        const routeStations = await Promise.all(
          routes.map(async (route) => {
            const { stations } = route.hasTrainType
              ? await fetchStationsByLineGroupId({
                  lineGroupId: route.trainTypeId,
                })
              : await fetchStationsByLineId({
                  lineId: route.lineId,
                });
            return { ...route, stations };
          })
        );

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

  useFocusEffect(
    useCallback(() => {
      const fetchStationsAsync = async () => {
        const lines = station?.lines ?? [];

        for (const line of lines) {
          if (lineStationsByIdMap.has(line.id)) continue;

          const { stations } = await fetchStationsByLineId({
            lineId: line.id,
            stationId: line.station?.id,
          });

          lineStationsByIdMap.set(line.id, stations);
        }
      };
      fetchStationsAsync();
    }, [station?.lines, fetchStationsByLineId, lineStationsByIdMap])
  );

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
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        limit: 1,
      });
      const stationFromAPI = data.stations[0] ?? null;
      setStationState((prev) => ({ ...prev, station: stationFromAPI }));
      setNavigationState((prev) => ({
        ...prev,
        stationForHeader: stationFromAPI,
      }));
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

  const handleLineSelected = useCallback(
    async (line: Line) => {
      const stations = lineStationsByIdMap.get(line.id) ?? [];
      pendingLineRef.current = line ?? null;
      pendingStationRef.current = line.station ?? null;
      pendingStationsRef.current = stations;
      setIsSelectBoundModalOpen(true);

      if (line.station?.hasTrainTypes) {
        const { trainTypes } = await fetchTrainTypes({
          stationId: line.station?.id,
        });
        const trainType =
          trainTypes.find(
            (tt) =>
              tt.groupId ===
              stations.find((s) => s.line?.id === line.id)?.trainType?.groupId
          ) ?? null;
        pendingTrainTypeRef.current = trainType;
        setNavigationState((prev) => ({
          ...prev,
          fetchedTrainTypes: trainTypes,
        }));
      }
    },
    [lineStationsByIdMap, fetchTrainTypes, setNavigationState]
  );

  // PresetCard押下時のモーダル表示ロジック（SavedRoutesScreenのhandleItemPress相当）
  const openModalByLineId = useCallback(
    async (lineId: number, destinationStationId: number | null) => {
      // try cache first
      const { stations } = await fetchStationsByLineId({ lineId });
      if (!stations.length) return;

      const wantedDestination =
        stations.find((sta) => sta.groupId === destinationStationId) ?? null;

      const nearestCoordinates = findNearest(
        {
          latitude: latitude ?? stations[0].latitude,
          longitude: longitude ?? stations[0].longitude,
        },
        stations.map((sta) => ({
          latitude: sta.latitude,
          longitude: sta.longitude,
        }))
      ) as { latitude: number; longitude: number };

      const station = stations.find(
        (sta) =>
          sta.latitude === nearestCoordinates.latitude &&
          sta.longitude === nearestCoordinates.longitude
      );

      if (!station) return;

      // モーダル表示用のローカル状態のみ更新（グローバルは確定時に反映）
      pendingStationRef.current = station;
      pendingStationsRef.current = stations;
      pendingTrainTypeRef.current = null;
      pendingLineRef.current = (station.line as Line) ?? null;
      pendingWantedDestinationRef.current = wantedDestination;
    },
    [fetchStationsByLineId, latitude, longitude]
  );

  const openModalByTrainTypeId = useCallback(
    async (lineGroupId: number, destinationStationId: number | null) => {
      const { stations } = await fetchStationsByLineGroupId({ lineGroupId });
      if (!stations.length) return;

      const wantedDestination =
        stations.find((sta) => sta.groupId === destinationStationId) ?? null;

      const nearestCoordinates = findNearest(
        {
          latitude: latitude ?? stations[0].latitude,
          longitude: longitude ?? stations[0].longitude,
        },
        stations.map((sta) => ({
          latitude: sta.latitude,
          longitude: sta.longitude,
        }))
      ) as { latitude: number; longitude: number };

      const station = stations.find(
        (sta) =>
          sta.latitude === nearestCoordinates.latitude &&
          sta.longitude === nearestCoordinates.longitude
      );

      if (!station) return;

      // モーダル表示用のローカル状態のみ更新（グローバルは確定時に反映）
      pendingStationRef.current = station;
      pendingStationsRef.current = stations;
      pendingLineRef.current = station?.line ?? null;
      pendingWantedDestinationRef.current = wantedDestination;

      if (station?.hasTrainTypes) {
        const { trainTypes } = await fetchTrainTypes({
          stationId: station?.id,
        });

        const trainType =
          trainTypes.find((tt) => tt.groupId === station.trainType?.groupId) ??
          null;
        pendingTrainTypeRef.current = trainType;
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

  const handleUpdateStation = useCallback(async () => {
    const pos = await fetchCurrentLocation();
    if (!pos) return;
    const data = await fetchByCoords({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      limit: 1,
    });
    const stationFromAPI = data.stations[0] ?? null;
    setStationState((prev) => ({
      ...prev,
      station:
        prev.station?.id !== stationFromAPI?.id ? stationFromAPI : prev.station,
    }));
    setNavigationState((prev) => ({
      ...prev,
      stationForHeader:
        prev.stationForHeader?.id !== stationFromAPI?.id
          ? stationFromAPI
          : prev.stationForHeader,
    }));
  }, [
    fetchByCoords,
    fetchCurrentLocation,
    setNavigationState,
    setStationState,
  ]);

  const handleCloseSelectBoundModal = useCallback(() => {
    setIsSelectBoundModalOpen(false);
    pendingStationRef.current = null;
    pendingStationsRef.current = null;
    pendingTrainTypeRef.current = null;
    pendingLineRef.current = null;
    pendingWantedDestinationRef.current = null;
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Line }) => (
      <LineCard
        line={item}
        onPress={() => handleLineSelected(item)}
        stations={lineStationsByIdMap.get(item.id) ?? []}
        testID={generateLineTestId(item)}
      />
    ),
    [handleLineSelected, lineStationsByIdMap]
  );

  const keyExtractor = useCallback((l: Line) => l.id.toString(), []);

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

  // Errors / Loading
  if (nearbyStationFetchError) {
    return (
      <ErrorScreen
        showStatus
        title={translate('errorTitle')}
        text={translate('apiErrorText')}
        onRetryPress={handleUpdateStation}
        isFetching={nearbyStationLoading}
      />
    );
  }

  return (
    <>
      <SafeAreaView style={[styles.root, !isLEDTheme && styles.screenBg]}>
        <Animated.FlatList
          style={StyleSheet.absoluteFill}
          data={station?.lines ?? []}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ItemSeparatorComponent={EmptyLineSeparator}
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
        stations={pendingStationsRef.current ?? []}
        trainType={pendingTrainTypeRef.current}
        line={pendingLineRef.current}
        destination={pendingWantedDestinationRef.current}
        loading={fetchTrainTypesStatus === 'pending'}
        error={fetchTrainTypesError}
      />
    </>
  );
};

export default React.memo(SelectLineScreen);
