import { useLazyQuery } from '@apollo/client/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Effect, pipe } from 'effect';
import * as Location from 'expo-location';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Orientation } from 'expo-screen-orientation';
import findNearest from 'geolib/es/findNearest';
import orderByDistance from 'geolib/es/orderByDistance';
import { useAtom, useSetAtom } from 'jotai';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import Animated, {
  LinearTransition,
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import type { Line, LineNested, Station, TrainType } from '~/@types/graphql';
import { CommonCard } from '~/components/CommonCard';
import { EmptyLineSeparator } from '~/components/EmptyLineSeparator';
import { NowHeader } from '~/components/NowHeader';
import { SelectBoundModal } from '~/components/SelectBoundModal';
import { useDeviceOrientation } from '~/hooks/useDeviceOrientation';
import { gqlClient } from '~/lib/gql';
import {
  GET_LINE_GROUP_STATIONS,
  GET_LINE_STATIONS,
  GET_STATION_TRAIN_TYPES,
} from '~/lib/graphql/queries';
import type { SavedRoute } from '~/models/SavedRoute';
import isTablet from '~/utils/isTablet';
import FooterTabBar, { FOOTER_BASE_HEIGHT } from '../components/FooterTabBar';
import { Heading } from '../components/Heading';
import { ASYNC_STORAGE_KEYS, LOCATION_TASK_NAME } from '../constants';
import {
  setLocation,
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
  listContainerStyle: {
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
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
      <Heading style={styles.heading} singleLine>
        {headingTitle}
      </Heading>
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
  const { station: stationFromAtom, stationsCache } = stationAtomState;
  const setNavigationState = useSetAtom(navigationState);
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);

  const latitude = useLocationStore(
    (state) => state?.location?.coords.latitude
  );
  const longitude = useLocationStore(
    (state) => state?.location?.coords.longitude
  );
  const footerHeight = FOOTER_BASE_HEIGHT + Math.max(insets.bottom, 8);
  const listPaddingBottom = useMemo(() => {
    const flattened = StyleSheet.flatten(styles.listContainerStyle) as {
      paddingBottom?: number;
    };
    return (flattened?.paddingBottom ?? 24) + footerHeight;
  }, [footerHeight]);

  const isLEDTheme = useThemeStore((s) => s === APP_THEME.LED);
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
    return (station?.lines ?? []).filter(
      (line): line is LineNested => line?.id != null
    );
  }, [station?.lines]);

  const { fetchCurrentLocation } = useFetchCurrentLocationOnce();
  const {
    routes,
    updateRoutes,
    isInitialized: isRoutesDBInitialized,
  } = useSavedRoutes();

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
        const jobs = routes.map((route) => {
          if (route.hasTrainType) {
            return gqlClient.query<{ lineGroupStations: Station[] }>({
              query: GET_LINE_GROUP_STATIONS,
              variables: {
                lineGroupId: route.trainTypeId,
              },
              context: { batchGroup: 'presets-init' },
            });
          }

          return gqlClient.query<{ lineStations: Station[] }>({
            query: GET_LINE_STATIONS,
            variables: {
              lineId: route.lineId,
            },
            context: { batchGroup: 'presets-init' },
          });
        });

        const results = await Promise.allSettled(jobs);
        const routeStations: Array<SavedRoute & { stations: Station[] }> =
          results.map((r, index) =>
            r.status === 'fulfilled'
              ? {
                  ...routes[index],
                  stations:
                    (r.value.data as { lineGroupStations: Station[] })
                      .lineGroupStations ??
                    (r.value.data as { lineStations: Station[] })
                      .lineStations ??
                    [],
                }
              : ({ ...routes[index], stations: [] } as SavedRoute & {
                  stations: Station[];
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
  }, [routes]);

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

  const updateStationsCache = useCallback(
    async (station: Station) => {
      const fetchedLines = (station.lines ?? []).filter(
        (line): line is LineNested => line?.id != null
      );

      const jobs = fetchedLines.map((line) =>
        gqlClient.query<{ lineStations: Station[] }>({
          query: GET_LINE_STATIONS,
          variables: {
            lineId: line.id as number,
          },
          context: { batchGroup: 'lines-init' },
        })
      );

      const results = await Promise.allSettled(jobs);

      const stationsCache: Station[][] = results.map((r) =>
        r.status === 'fulfilled'
          ? (r.value.data?.lineStations ?? [])
          : ([] as Station[])
      );

      setStationState((prev) => ({
        ...prev,
        stationsCache,
      }));
    },
    [setStationState]
  );

  useEffect(() => {
    const fetchInitialNearbyStationAsync = async () => {
      if (station) return;

      const location = await fetchCurrentLocation(true);
      if (!location) return;
      setLocation(location);
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

      if (stationFromAPI) {
        await updateStationsCache(stationFromAPI);
      }
    };
    fetchInitialNearbyStationAsync();
  }, [
    fetchByCoords,
    fetchCurrentLocation,
    setNavigationState,
    setStationState,
    station,
    updateStationsCache,
  ]);

  useEffect(() => {
    if (!station) return;
    updateStationsCache(station);
  }, [station, updateStationsCache]);

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
      const lineId = line.id;
      const lineStationId = line.station?.id;
      if (!lineId || !lineStationId) return;

      setIsSelectBoundModalOpen(true);

      const result = await fetchStationsByLineId({
        variables: { lineId, stationId: lineStationId },
      });
      const fetchedStations = result.data?.lineStations ?? [];

      const pendingStation =
        fetchedStations.find((s) => s.id === lineStationId) ?? null;

      setStationState((prev) => ({
        ...prev,
        pendingStation,
        pendingStations: fetchedStations,
        selectedDirection: null,
        wantedDestination: null,
        selectedBound: null,
      }));
      setLineState((prev) => ({
        ...prev,
        pendingLine: line ?? null,
      }));
      setNavigationState((prev) => ({
        ...prev,
        fetchedTrainTypes: [],
        trainType: null,
        pendingTrainType: null,
      }));

      if (line.station?.hasTrainTypes) {
        const result = await fetchTrainTypes({
          variables: {
            stationId: lineStationId,
          },
        });
        const fetchedTrainTypes = result.data?.stationTrainTypes ?? [];
        const designatedTrainTypeId =
          fetchedStations.find((s) => s.id === lineStationId)?.trainType?.id ??
          null;
        const designatedTrainType =
          fetchedTrainTypes.find((tt) => tt.id === designatedTrainTypeId) ??
          null;
        setNavigationState((prev) => ({
          ...prev,
          fetchedTrainTypes,
          pendingTrainType: designatedTrainType as TrainType | null,
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
        pendingTrainType: trainType,
      }));
    },
    [fetchStationsByLineGroupId, setStationState, setNavigationState]
  );

  // PresetCard押下時のモーダル表示ロジック
  const openModalByLineId = useCallback(
    async (lineId: number) => {
      const result = await fetchStationsByLineId({
        variables: { lineId },
      });
      const stations = result.data?.lineStations ?? [];
      if (!stations.length) return;

      const nearestCoordinates =
        latitude && longitude
          ? (findNearest(
              { latitude, longitude },
              stations.map((sta: Station) => ({
                latitude: sta.latitude as number,
                longitude: sta.longitude as number,
              }))
            ) as { latitude: number; longitude: number })
          : stations.map((s) => ({
              latitude: s.latitude,
              longitude: s.longitude,
            }))[0];

      const station = stations.find(
        (sta: Station) =>
          sta.latitude === nearestCoordinates.latitude &&
          sta.longitude === nearestCoordinates.longitude
      );

      if (!station) return;

      setStationState((prev) => ({
        ...prev,
        selectedDirection: null,
        pendingStation: station,
        pendingStations: stations,
        wantedDestination: null,
      }));
      setLineState((prev) => ({
        ...prev,
        pendingLine: (station.line as Line) ?? null,
      }));
    },
    [fetchStationsByLineId, latitude, longitude, setStationState, setLineState]
  );

  // PresetCard押下時のモーダル表示ロジック
  const openModalByTrainTypeId = useCallback(
    async (lineGroupId: number) => {
      const result = await fetchStationsByLineGroupId({
        variables: { lineGroupId },
      });
      const stations = result.data?.lineGroupStations ?? [];
      if (!stations.length) return;

      const sortedStationCoords =
        latitude && longitude
          ? (orderByDistance(
              { lat: latitude, lon: longitude },
              stations.map((sta) => ({
                latitude: sta.latitude as number,
                longitude: sta.longitude as number,
              }))
            ) as { latitude: number; longitude: number }[])
          : stations.map((sta) => ({
              latitude: sta.latitude,
              longitude: sta.longitude,
            }));

      const sortedStations = stations.slice().sort((a, b) => {
        const aIndex = sortedStationCoords.findIndex(
          (coord) =>
            coord.latitude === a.latitude && coord.longitude === a.longitude
        );
        const bIndex = sortedStationCoords.findIndex(
          (coord) =>
            coord.latitude === b.latitude && coord.longitude === b.longitude
        );
        return aIndex - bIndex;
      });

      const station = sortedStations.find(
        (sta: Station) => sta.trainType?.groupId === lineGroupId
      );

      if (!station) return;

      setStationState((prev) => ({
        ...prev,
        pendingStation: station,
        pendingStations: stations,
      }));
      setLineState((prev) => ({
        ...prev,
        pendingLine: station?.line ?? null,
      }));

      const fetchedTrainTypesData = await fetchTrainTypes({
        variables: {
          stationId: station.id as number,
        },
      });
      const trainTypes = fetchedTrainTypesData.data?.stationTrainTypes ?? [];

      setNavigationState((prev) => ({
        ...prev,
        pendingTrainType: station.trainType ?? null,
        fetchedTrainTypes: trainTypes,
      }));
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
        await openModalByTrainTypeId(route.trainTypeId);
      } else {
        await openModalByLineId(route.lineId);
      }
    },
    [openModalByLineId, openModalByTrainTypeId]
  );

  const handleCloseSelectBoundModal = useCallback(() => {
    setIsSelectBoundModalOpen(false);
  }, []);

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

  const renderLineCard = useCallback(
    (line: Line, index: number) => {
      if (fetchStationsByLineIdLoading) {
        return (
          <SkeletonPlaceholder borderRadius={4} speed={1500}>
            <SkeletonPlaceholder.Item width="100%" height={72} />
          </SkeletonPlaceholder>
        );
      }

      return (
        <CommonCard
          line={line}
          onPress={() => handleLineSelected(line)}
          stations={stationsCache[index] ?? []}
          testID={generateLineTestId(line)}
        />
      );
    },
    [fetchStationsByLineIdLoading, handleLineSelected, stationsCache]
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

  const renderLineRow = useCallback(
    (rowLines: Line[], rowIndex: number) => {
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
            {rowLines.map((line, colIndex) => {
              const index = rowIndex * numColumns + colIndex;
              return (
                <Animated.View
                  layout={LinearTransition.springify()}
                  key={line.id as number}
                  style={isTablet ? { flex: 1 } : undefined}
                >
                  {renderLineCard(line, index)}
                </Animated.View>
              );
            })}
            {renderPlaceholders(rowIndex, numColumns - rowLines.length)}
          </Animated.View>
        </>
      );
    },
    [numColumns, renderLineCard, renderPlaceholders]
  );

  return (
    <>
      <SafeAreaView style={[styles.root, !isLEDTheme && styles.screenBg]}>
        <Animated.ScrollView
          style={StyleSheet.absoluteFill}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[
            styles.listContainerStyle,
            nowHeaderHeight ? { paddingTop: nowHeaderHeight } : null,
            { paddingBottom: listPaddingBottom },
          ]}
        >
          <ListHeader
            headingTitle={headingTitle}
            carouselData={carouselData}
            isPresetsLoading={isPresetsLoading}
            onPress={handlePresetPress}
          />
          {nearbyStationLoading ? (
            <NearbyStationLoader />
          ) : (
            Array.from({
              length: Math.ceil(stationLines.length / numColumns),
            }).map((_, rowIndex) => {
              const rowLines = stationLines.slice(
                rowIndex * numColumns,
                (rowIndex + 1) * numColumns
              );
              const rowKey = rowLines.map((l) => l.id).join('-');
              return (
                <React.Fragment key={rowKey}>
                  {renderLineRow(rowLines, rowIndex)}
                </React.Fragment>
              );
            })
          )}
          <EmptyLineSeparator />
        </Animated.ScrollView>
      </SafeAreaView>
      {/* 固定ヘッダー */}
      <NowHeader
        station={station}
        onLayout={(e) => setNowHeaderHeight(e.nativeEvent.layout.height + 32)}
        scrollY={scrollY}
      />

      {/* フッター */}
      <FooterTabBar active="home" />
      {/* モーダル */}
      <SelectBoundModal
        visible={isSelectBoundModalOpen}
        onClose={handleCloseSelectBoundModal}
        onBoundSelect={handleCloseSelectBoundModal}
        loading={
          fetchTrainTypesLoading ||
          fetchStationsByLineIdLoading ||
          fetchStationsByLineGroupIdLoading
        }
        error={
          fetchTrainTypesError ??
          fetchStationsByLineIdError ??
          fetchStationsByLineGroupIdError ??
          null
        }
        onTrainTypeSelect={handleTrainTypeSelect}
      />
    </>
  );
};

export default React.memo(SelectLineScreen);
