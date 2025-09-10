import { useMutation } from '@connectrpc/connect-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Effect, pipe } from 'effect';
import { BlurView } from 'expo-blur';
import * as Location from 'expo-location';
import * as ScreenOrientation from 'expo-screen-orientation';
import findNearest from 'geolib/es/findNearest';
import { useAtomValue, useSetAtom } from 'jotai';
import isEqual from 'lodash/isEqual';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { NoPresetsCard } from '~/components/NoPresetsCard';
import { SavedRouteInfoModal } from '~/components/SavedRouteInfoModal';
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
import { PresetCard } from '../components/PresetCard';
import Typography from '../components/Typography';
import { ASYNC_STORAGE_KEYS, LOCATION_TASK_NAME } from '../constants';
import {
  useConnectivity,
  useFetchCurrentLocationOnce,
  useFetchNearbyStation,
  useLocationStore,
  useThemeStore,
} from '../hooks';
import { useSavedRoutes } from '../hooks/useSavedRoutes';
import { APP_THEME } from '../models/Theme';
import lineState from '../store/atoms/line';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { isJapanese, translate } from '../translation';
import { generateLineTestId } from '../utils/generateTestID';
import { RFValue } from '../utils/rfValue';

const styles = StyleSheet.create({
  root: { paddingHorizontal: 24, paddingTop: 0, flex: 1 },
  listContainerStyle: { paddingBottom: 24, paddingHorizontal: 24 },
  lineName: {
    fontSize: RFValue(14),
    fontWeight: 'bold',
  },
  heading: {
    marginBottom: 16,
  },
  screenBg: {
    backgroundColor: '#FAFAFA',
  },
  nowBar: {
    marginBottom: 12,
  },
  nowLabel: {
    fontSize: RFValue(12),
    textAlign: 'left',
  },
  nowStation: {
    fontSize: RFValue(24),
    fontWeight: 'bold',
    textAlign: 'left',
    lineHeight: RFValue(32),
  },
  nowHeaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    // SafeAreaView内のpaddingと見た目を合わせる
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    zIndex: 10,
  },
  nowHeaderCard: {
    width: '100%',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: 'hidden',
    // iOS shadow
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    // Android fallback
    elevation: 4,
  },
  nowHeaderContent: {
    paddingHorizontal: 24,
    paddingBottom: 10,
  },
});

type LineCardItemProps = {
  line: Line;
  disabled: boolean;
  onPress: (line: Line) => void;
  stations?: Station[];
};

const LineCardItem: React.FC<LineCardItemProps> = ({
  line,
  disabled,
  onPress,
  stations,
}) => {
  return (
    <LineCard
      line={line}
      onPress={() => onPress(line)}
      disabled={disabled}
      stations={stations ?? []}
      testID={generateLineTestId(line)}
    />
  );
};

// 無駄な再描画を回避（同一props時にはレンダリングしない）
const LineCardItemMemo = React.memo(LineCardItem);

const SelectLineScreen: React.FC = () => {
  const setStationState = useSetAtom(stationState);
  const setNavigationState = useSetAtom(navigationState);
  const setLineState = useSetAtom(lineState);
  const { stationForHeader } = useAtomValue(navigationState);
  const latitude = useLocationStore((state) => state?.coords.latitude);
  const longitude = useLocationStore((state) => state?.coords.longitude);
  const insets = useSafeAreaInsets();
  const footerHeight = FOOTER_BASE_HEIGHT + Math.max(insets.bottom, 8);
  const scrollY = React.useRef(new Animated.Value(0)).current;
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
  const station = useMemo(() => nearbyStations[0] ?? null, [nearbyStations]);

  const isInternetAvailable = useConnectivity();
  const { fetchCurrentLocation } = useFetchCurrentLocationOnce();
  const [nowHeaderHeight, setNowHeaderHeight] = React.useState(0);
  const {
    routes,
    updateRoutes,
    isInitialized: isRoutesDBInitialized,
  } = useSavedRoutes();
  const [lineStationsById, setLineStationsById] = React.useState<
    Record<number, Station[]>
  >({});
  const [carouselData, setCarouselData] = React.useState<LoopItem[]>([]);

  // SavedRouteモーダル用の状態
  const [selectedRoute, setSelectedRoute] = useState<SavedRoute | null>(null);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [isSelectBoundModalOpen, setIsSelectBoundModalOpen] = useState(false);
  // 確定時にのみ反映するための一時保存データ
  const pendingStationRef = React.useRef<Station | null>(null);
  const pendingStationsRef = React.useRef<Station[] | null>(null);
  const pendingTrainTypeRef = React.useRef<TrainType | null>(null);
  const pendingLineRef = React.useRef<Line | null>(null);
  const pendingWantedDestinationRef = React.useRef<Station | null>(null);

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

  // Carousel layout metrics
  const CARD_GAP = 12;
  const screenWidth = Dimensions.get('window').width;
  const cardWidth = screenWidth; // アイテム幅は画面幅いっぱい
  const sidePadding = 0; // カルーセルの左右余白なし

  const loopData = useMemo(
    () =>
      carouselData.length
        ? [
            ...carouselData.map((r, i) => ({ ...r, __k: `${r.id}-a-${i}` })),
            ...carouselData.map((r, i) => ({ ...r, __k: `${r.id}-b-${i}` })),
            ...carouselData.map((r, i) => ({ ...r, __k: `${r.id}-c-${i}` })),
          ]
        : [],
    [carouselData]
  );
  const ITEM_SIZE = cardWidth + CARD_GAP;
  // const MID_BLOCK_START = carouselData.length; // 真ん中ブロック開始index
  type LoopItem = (SavedRoute & { stations: Station[] }) & { __k: string };
  const listRef = React.useRef<FlatList<LoopItem>>(null);
  const carouselOffsetRef = React.useRef(0);
  const snapOffsets = useMemo(
    () => loopData.map((_, i) => sidePadding + i * ITEM_SIZE),
    [loopData, ITEM_SIZE]
  );

  // 現在の“論理インデックス”（carouselData基準）を保持して、再描画でも位置を維持
  const currentLogicalIndexRef = React.useRef(0);

  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!carouselData.length) return;
      const x = e.nativeEvent.contentOffset.x;
      const rawIndex = Math.round((x - sidePadding) / ITEM_SIZE);
      // 論理インデックス（0..length-1）を保存しておく
      const logicalIndex =
        ((rawIndex % carouselData.length) + carouselData.length) %
        carouselData.length;
      currentLogicalIndexRef.current = logicalIndex;
      // ループのため、先頭ブロックに来たら1ブロック先へ、末尾ブロックなら1ブロック戻す
      if (rawIndex < carouselData.length) {
        const newOffset =
          sidePadding + (rawIndex + carouselData.length) * ITEM_SIZE;
        carouselOffsetRef.current = newOffset;
        listRef.current?.scrollToOffset({ offset: newOffset, animated: false });
      } else if (rawIndex >= carouselData.length * 2) {
        const newOffset =
          sidePadding + (rawIndex - carouselData.length) * ITEM_SIZE;
        carouselOffsetRef.current = newOffset;
        listRef.current?.scrollToOffset({ offset: newOffset, animated: false });
      }
    },
    [ITEM_SIZE, carouselData.length]
  );

  useEffect(() => {
    ScreenOrientation.unlockAsync().catch(console.error);
  }, []);

  useEffect(() => {
    if (!isRoutesDBInitialized) return;
    updateRoutes();
  }, [isRoutesDBInitialized, updateRoutes]);

  useEffect(() => {
    if (!routes.length) return;
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

  useEffect(() => {
    const lines = station?.lines ?? [];
    if (!lines.length) return;

    const fetchStationsAsync = async () => {
      for (const line of lines) {
        if (lineStationsById[line.id]) continue;

        const { stations } = await fetchStationsByLineId({
          lineId: line.id,
          stationId: line.station?.id,
        });

        setLineStationsById((prev) => {
          if (isEqual(prev[line.id], stations)) return prev;
          return { ...prev, [line.id]: stations };
        });
      }
    };

    fetchStationsAsync();
  }, [station?.lines, fetchStationsByLineId, lineStationsById]);

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
    if (station) return;

    const run = async () => {
      try {
        // Try last-known fast; then race a fresh read with a short timeout
        const lastOrFresh = await fetchCurrentLocation(true, 3000);
        if (!lastOrFresh) return;
        useLocationStore.setState(lastOrFresh);
        const data = await fetchByCoords({
          latitude: lastOrFresh.coords.latitude,
          longitude: lastOrFresh.coords.longitude,
          limit: 1,
        });
        const stationFromAPI = data.stations[0] ?? null;
        setStationState((prev) => ({ ...prev, station: stationFromAPI }));
        setNavigationState((prev) => ({
          ...prev,
          stationForHeader: stationFromAPI,
        }));
      } catch {
        // noop; ErrorScreen will handle if nothing
      }
    };
    void run();
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
      const stations = lineStationsById[line.id] ?? [];
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
    [lineStationsById, fetchTrainTypes, setNavigationState]
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
      setSelectedRoute(route);
      setIsPresetModalOpen(true);
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

  const handleCloseModal = useCallback(() => {
    setIsPresetModalOpen(false);
    // ローカル状態のみクリア（グローバルは未変更）
    pendingStationRef.current = null;
    pendingStationsRef.current = null;
    pendingTrainTypeRef.current = null;
    pendingLineRef.current = null;
  }, []);

  const handleRouteConfirmed = useCallback(() => {
    // ここでのみグローバル状態を更新
    const st = pendingStationRef.current;
    const sts = pendingStationsRef.current ?? [];
    const tt = pendingTrainTypeRef.current;
    const line = pendingLineRef.current;
    if (st) {
      setStationState((prev) => ({ ...prev, station: st, stations: sts }));
      setNavigationState((prev) => ({
        ...prev,
        stationForHeader: st,
        leftStations: [],
        trainType: tt ?? null,
      }));
      setLineState((prev) => ({ ...prev, selectedLine: line ?? null }));
      setStationState((prev) => ({
        ...prev,
        wantedDestination: pendingWantedDestinationRef.current ?? null,
      }));
    }
    setIsPresetModalOpen(false);
    setIsSelectBoundModalOpen(true);
  }, [setLineState, setNavigationState, setStationState]);

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

  const renderItem = useCallback(
    ({ item }: { item: Line }) => (
      <LineCardItemMemo
        line={item}
        disabled={!isInternetAvailable}
        onPress={handleLineSelected}
        stations={lineStationsById[item.id]}
      />
    ),
    [handleLineSelected, isInternetAvailable, lineStationsById]
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

  const nowHeader = useMemo(() => {
    const target = stationForHeader ?? station;
    if (!target) return null;
    const re = /\([^()]*\)/g;
    const label = isJapanese ? 'ただいま' : 'Now at';
    const name = isJapanese
      ? (target.name ?? '').replace(re, '')
      : (target.nameRoman ?? target.name ?? '').replace(re, '');
    return { label, name };
  }, [stationForHeader, station]);

  // Animate header: station name shrinks 24 -> 16, stacked -> inline
  const COLLAPSE_RANGE = 64;
  const stackedOpacity = scrollY.interpolate({
    inputRange: [0, COLLAPSE_RANGE * 0.5],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const inlineOpacity = scrollY.interpolate({
    inputRange: [0, COLLAPSE_RANGE * 0.5, COLLAPSE_RANGE],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });
  const animatedStationFont = scrollY.interpolate({
    inputRange: [0, COLLAPSE_RANGE],
    outputRange: [RFValue(24), RFValue(16)],
    extrapolate: 'clamp',
  });

  const AnimatedTypography = React.useMemo(
    () => Animated.createAnimatedComponent(Typography),
    []
  );

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
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListHeaderComponent={() => (
            <>
              <View style={{ marginHorizontal: -24 }}>
                <FlatList<LoopItem>
                  ref={listRef}
                  horizontal
                  data={loopData}
                  keyExtractor={(item) => item.__k}
                  ListEmptyComponent={() =>
                    isPresetsLoading ? (
                      <SkeletonPlaceholder borderRadius={4} speed={1500}>
                        <SkeletonPlaceholder.Item
                          width={cardWidth - 48}
                          height={160}
                          style={{ marginHorizontal: 24 }}
                        />
                      </SkeletonPlaceholder>
                    ) : (
                      <View
                        style={{
                          width: cardWidth,
                          height: 160,
                          justifyContent: 'center',
                        }}
                      >
                        <View style={{ marginHorizontal: 24 }}>
                          <NoPresetsCard />
                        </View>
                      </View>
                    )
                  }
                  renderItem={({ item }) => (
                    <View style={{ width: cardWidth }}>
                      <View style={{ marginHorizontal: 24 }}>
                        <Pressable onPress={() => handlePresetPress(item)}>
                          <PresetCard
                            title={item.name}
                            from={item.stations[0]}
                            to={item.stations[item.stations.length - 1]}
                          />
                        </Pressable>
                      </View>
                    </View>
                  )}
                  ItemSeparatorComponent={() => (
                    <View style={{ width: CARD_GAP }} />
                  )}
                  showsHorizontalScrollIndicator={false}
                  snapToOffsets={snapOffsets}
                  onScroll={(e) => {
                    if (!carouselData.length) return;
                    const x = e.nativeEvent.contentOffset.x;
                    carouselOffsetRef.current = x;
                    const rawIndex = Math.round((x - sidePadding) / ITEM_SIZE);
                    const logicalIndex =
                      ((rawIndex % carouselData.length) + carouselData.length) %
                      carouselData.length;
                    currentLogicalIndexRef.current = logicalIndex;
                  }}
                  onMomentumScrollEnd={handleMomentumEnd}
                  decelerationRate="fast"
                  snapToAlignment="start"
                  disableIntervalMomentum
                  contentContainerStyle={{
                    paddingHorizontal: 0,
                    marginBottom: 48,
                  }}
                />
              </View>

              <Heading
                style={[
                  styles.heading,
                  {
                    fontSize: 24,
                    textAlign: 'left',
                    fontWeight: 'bold',
                  },
                ]}
              >
                {headingTitle}
              </Heading>
            </>
          )}
          ListFooterComponent={() => <View style={{ height: 12 }} />}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
          contentContainerStyle={[
            styles.listContainerStyle,
            nowHeaderHeight ? { paddingTop: nowHeaderHeight } : null,
            { paddingBottom: listPaddingBottom },
          ]}
        />
        {/* Auto mode display removed on this screen */}
      </SafeAreaView>
      {/* 固定ヘッダー: ただいま / Now at (背景ブラー) - SafeAreaViewの外に出して上左右の余白をなくす */}
      {nowHeader ? (
        <View pointerEvents="none" style={styles.nowHeaderContainer}>
          <View
            style={styles.nowHeaderCard}
            onLayout={(e) =>
              setNowHeaderHeight(e.nativeEvent.layout.height + 32)
            }
          >
            <BlurView
              intensity={40}
              tint={isLEDTheme ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
            <View style={[styles.nowHeaderContent, { paddingTop: insets.top }]}>
              {/* Stacked layout (fades out) */}
              <Animated.View style={{ opacity: stackedOpacity }}>
                <Typography style={styles.nowLabel}>
                  {nowHeader.label}
                </Typography>
                <AnimatedTypography
                  style={{
                    ...styles.nowStation,
                    fontSize: animatedStationFont as unknown as number,
                  }}
                >
                  {nowHeader.name}
                </AnimatedTypography>
              </Animated.View>
              {/* Inline layout (fades in) */}
              <Animated.View
                style={{
                  opacity: inlineOpacity,
                  flexDirection: 'row',
                  alignItems: 'flex-end',
                  gap: 6,
                  position: 'absolute',
                  left: 24,
                  right: 24,
                  bottom: 10,
                }}
              >
                <Typography style={styles.nowLabel}>
                  {nowHeader.label}
                </Typography>
                <Typography
                  style={{ fontSize: RFValue(16), fontWeight: 'bold' }}
                >
                  {isJapanese ? `${nowHeader.name}` : nowHeader.name}
                </Typography>
              </Animated.View>
            </View>
          </View>
        </View>
      ) : null}
      {/* Footer */}
      <FooterTabBar active="home" />
      {/* SavedRoute モーダル */}
      <SavedRouteInfoModal
        visible={isPresetModalOpen}
        trainType={pendingTrainTypeRef.current}
        stations={pendingStationsRef.current ?? []}
        routeName={selectedRoute?.name ?? ''}
        onClose={handleCloseModal}
        onConfirmed={handleRouteConfirmed}
        loading={fetchTrainTypesStatus === 'pending'}
        error={fetchTrainTypesError}
      />
      <SelectBoundModal
        visible={isSelectBoundModalOpen}
        onClose={() => setIsSelectBoundModalOpen(false)}
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
