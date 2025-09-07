import { useMutation } from '@connectrpc/connect-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Effect, pipe } from 'effect';
import { BlurView } from 'expo-blur';
import * as Location from 'expo-location';
import findNearest from 'geolib/es/findNearest';
import { useAtomValue, useSetAtom } from 'jotai';
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
import Loading from '~/components/Loading';
import { SavedRouteInfoModal } from '~/components/SavedRouteInfoModal';
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
import { PresetCard } from '../components/PresetCard';
import Typography from '../components/Typography';
import VerticalLineCard from '../components/VerticalLineCard';
import { ASYNC_STORAGE_KEYS, LOCATION_TASK_NAME } from '../constants';
import {
  useConnectivity,
  useCurrentStation,
  useFetchCurrentLocationOnce,
  useFetchNearbyStation,
  useLocationStore,
  useThemeStore,
} from '../hooks';
import { useLineStationsCache } from '../hooks/useLineStationsCache';
import { useSavedRoutes } from '../hooks/useSavedRoutes';
import { useStationsCache } from '../hooks/useStationsCache';
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

// ルートIDごとの駅配列をキャッシュ
// キャッシュは useStationsCache 内に集約

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
    <VerticalLineCard
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

const VerticalSelectLineScreen: React.FC = () => {
  const setStationState = useSetAtom(stationState);
  const setNavigationState = useSetAtom(navigationState);
  const setLineState = useSetAtom(lineState);
  const { stationForHeader } = useAtomValue(navigationState);
  const { stations: globalStations } = useAtomValue(stationState);
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
    fetchByCoords,
    isLoading: nearbyStationLoading,
    error: nearbyStationFetchError,
  } = useFetchNearbyStation();
  const isInternetAvailable = useConnectivity();
  const {
    fetchCurrentLocation,
    loading: locationLoading,
    error: fetchLocationError,
  } = useFetchCurrentLocationOnce();
  const station = useCurrentStation();
  const [nowHeaderHeight, setNowHeaderHeight] = React.useState(0);
  const { getAll, isInitialized } = useSavedRoutes();
  const { getStations } = useStationsCache();
  const lineStationsCache = useLineStationsCache();
  const [routes, setRoutes] = React.useState<
    (SavedRoute & { stations: Station[] })[]
  >([]);
  const [lineStationsById, setLineStationsById] = React.useState<
    Record<number, Station[]>
  >({});

  // SavedRouteモーダル用の状態
  const [selectedRoute, setSelectedRoute] = useState<SavedRoute | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStations, setModalStations] = useState<Station[]>([]);
  const [modalTrainType, setModalTrainType] = useState<TrainType | null>(null);
  // 確定時にのみ反映するための一時保存データ
  const pendingStationRef = React.useRef<Station | null>(null);
  const pendingStationsRef = React.useRef<Station[] | null>(null);
  const pendingTrainTypeRef = React.useRef<TrainType | null>(null);
  const pendingLineRef = React.useRef<Line | null>(null);
  const pendingWantedDestinationRef = React.useRef<Station | null>(null);

  const {
    mutateAsync: fetchStationsByLineId,
    status: fetchStationsByLineIdStatus,
    error: fetchStationsByLineIdError,
  } = useMutation(getStationsByLineId);
  const {
    mutateAsync: fetchStationsByLineGroupId,
    status: fetchStationsByLineGroupIdStatus,
    error: fetchStationsByLineGroupIdError,
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

  const carouselData = useMemo<(SavedRoute & { stations: Station[] })[]>(
    () => routes.filter((r) => (r.stations?.length ?? 0) > 0),
    [routes]
  );
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

  // 初期位置を「現在の論理インデックス」で真ん中ブロックへ移動（再マウント時も維持）
  // useEffect(() => {
  //   if (!loopData.length) return;
  //   const logical =
  //     currentLogicalIndexRef.current % Math.max(carouselData.length, 1);
  //   const offset = sidePadding + (MID_BLOCK_START + logical) * ITEM_SIZE;
  //   carouselOffsetRef.current = offset;
  //   requestAnimationFrame(() => {
  //     listRef.current?.scrollToOffset({ offset, animated: false });
  //   });
  // }, [ITEM_SIZE, MID_BLOCK_START, loopData.length, carouselData.length]);

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

  // PresetCard押下でも現在のインデックスを維持（押下でレイアウトが変わっても戻せるように）
  const preserveCarouselPosition = useCallback(() => {
    if (!loopData.length) return;
    const offset = carouselOffsetRef.current;
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset, animated: false });
    });
  }, [loopData.length]);

  // 保存済み経路カード用: 最新の保存ルートから目的地駅を取得（キャッシュ併用）
  useEffect(() => {
    const run = async () => {
      if (!isInitialized) return;
      try {
        const routes = await getAll();

        const next = await Promise.all(
          routes.map(async (route) => {
            const stations = await getStations(route);
            return { ...route, stations };
          })
        );

        setRoutes((prev) => {
          const equal =
            prev.length === next.length &&
            prev.every((p, i) => {
              const n = next[i];
              if (p.id !== n.id) return false;
              if (p.name !== n.name) return false;
              if (p.lineId !== n.lineId) return false;
              if (p.trainTypeId !== n.trainTypeId) return false;
              if (p.destinationStationId !== n.destinationStationId)
                return false;
              if (p.hasTrainType !== n.hasTrainType) return false;
              const pFirst = p.stations[0]?.id;
              const pLast = p.stations[p.stations.length - 1]?.id;
              const nFirst = n.stations[0]?.id;
              const nLast = n.stations[n.stations.length - 1]?.id;
              return pFirst === nFirst && pLast === nLast;
            });
          return equal ? prev : next;
        });
      } catch (err) {
        console.error(err);
      }
    };
    run();
  }, [getAll, isInitialized, getStations]);

  useEffect(() => {
    // Prefetch line stations with small concurrency and publish into local state for rendering
    const lines = station?.lines ?? [];
    if (!lines.length) return;
    let cancelled = false;
    const run = async () => {
      const ids = lines.map((l) => l.id);
      const queue = ids.filter((id) => !lineStationsById[id]);
      let i = 0;
      const worker = async () => {
        while (i < queue.length && !cancelled) {
          const idx = i++;
          const id = queue[idx];
          try {
            const stations = await lineStationsCache.getStations(id);
            if (cancelled) return;
            setLineStationsById((prev) =>
              prev[id] === stations ? prev : { ...prev, [id]: stations }
            );
          } catch {
            // ignore
          }
        }
      };
      await Promise.all([worker(), worker()]);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [station?.lines, lineStationsCache, lineStationsById]);

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

  const navigation = useNavigation();

  const handleLineSelected = useCallback(
    (line: Line): void => {
      setNavigationState((prev) => ({
        ...prev,
        trainType: line.station?.trainType ?? null,
        leftStations: [],
      }));
      setLineState((prev) => ({ ...prev, selectedLine: line }));
      navigation.navigate('SelectBound' as never);
    },
    [navigation, setLineState, setNavigationState]
  );

  // PresetCard押下時のモーダル表示ロジック（SavedRoutesScreenのhandleItemPress相当）
  const openModalByLineId = useCallback(
    async (lineId: number, destinationStationId: number | null) => {
      // try cache first
      const cached = await lineStationsCache
        .getStations(lineId)
        .catch(() => [] as Station[]);
      const stations =
        (cached?.length
          ? cached
          : (await fetchStationsByLineId({ lineId })).stations) ?? [];
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
      setModalStations(stations);
      setModalTrainType(null);
    },
    [fetchStationsByLineId, latitude, longitude, lineStationsCache]
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

      const { trainTypes } = await fetchTrainTypes({ stationId: station.id });
      const trainType =
        trainTypes.find((tt) => tt.groupId === lineGroupId) ?? null;

      // モーダル表示用のローカル状態のみ更新（グローバルは確定時に反映）
      pendingStationRef.current = station;
      pendingStationsRef.current = stations;
      pendingTrainTypeRef.current = trainType;
      pendingLineRef.current = (trainType?.line as Line) ?? null;
      pendingWantedDestinationRef.current = wantedDestination;
      setModalStations(stations);
      setModalTrainType(trainType);
    },
    [fetchStationsByLineGroupId, fetchTrainTypes, latitude, longitude]
  );

  const handlePresetPress = useCallback(
    async (route: SavedRoute) => {
      // 押下直後に現在位置を記録・維持
      preserveCarouselPosition();
      setSelectedRoute(route);
      setIsModalOpen(true);
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
      // 状態更新後にも再度位置を復元
      preserveCarouselPosition();
    },
    [openModalByLineId, openModalByTrainTypeId, preserveCarouselPosition]
  );

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    // ローカル状態のみクリア（グローバルは未変更）
    setModalStations([]);
    setModalTrainType(null);
    pendingStationRef.current = null;
    pendingStationsRef.current = null;
    pendingTrainTypeRef.current = null;
    pendingLineRef.current = null;
    // 表示位置を即時復元（モーダル開閉による再レイアウトに備える）
    requestAnimationFrame(() => preserveCarouselPosition());
  }, [preserveCarouselPosition]);

  const handleRouteConfirmed = useCallback(
    (_trainType?: TrainType, _asTerminus?: boolean) => {
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
      setIsModalOpen(false);
      navigation.navigate('SelectBound' as never);
    },
    [navigation, setLineState, setNavigationState, setStationState]
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

  // NOTE: ブラー効果を効かせるため、リストはヘッダー直下から開始（余白で押し下げない）

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

  if (fetchLocationError && !station) {
    return (
      <ErrorScreen
        showSearchStation
        title={translate('errorTitle')}
        text={translate('couldNotGetLocation')}
        onRetryPress={handleUpdateStation}
        isFetching={locationLoading}
      />
    );
  }

  if (!station) {
    return (
      <Loading message={translate('loadingAPI')} linkType="serverStatus" />
    );
  }

  return (
    <>
      <SafeAreaView style={[styles.root, !isLEDTheme && styles.screenBg]}>
        <Animated.FlatList
          style={StyleSheet.absoluteFill}
          data={station.lines}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListHeaderComponent={() => (
            <>
              {loopData.length ? (
                <View style={{ marginHorizontal: -24 }}>
                  <FlatList<LoopItem>
                    ref={listRef}
                    horizontal
                    data={loopData}
                    keyExtractor={(item) => item.__k}
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
                      const rawIndex = Math.round(
                        (x - sidePadding) / ITEM_SIZE
                      );
                      const logicalIndex =
                        ((rawIndex % carouselData.length) +
                          carouselData.length) %
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
              ) : (
                <SkeletonPlaceholder borderRadius={4} speed={1500}>
                  <SkeletonPlaceholder.Item
                    width="100%"
                    height={160}
                    style={{ marginBottom: 48 }}
                  />
                </SkeletonPlaceholder>
              )}

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
        visible={isModalOpen}
        trainType={modalTrainType}
        stations={modalStations.length ? modalStations : globalStations}
        loading={
          fetchStationsByLineIdStatus === 'pending' ||
          fetchTrainTypesStatus === 'pending' ||
          fetchStationsByLineGroupIdStatus === 'pending'
        }
        error={
          fetchStationsByLineIdError ||
          fetchTrainTypesError ||
          fetchStationsByLineGroupIdError
        }
        routeName={selectedRoute?.name ?? ''}
        onClose={handleCloseModal}
        onConfirmed={handleRouteConfirmed}
      />
    </>
  );
};

export default React.memo(VerticalSelectLineScreen);
