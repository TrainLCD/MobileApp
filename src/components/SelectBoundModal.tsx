import { CommonActions, useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { useAtom, useAtomValue } from 'jotai';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import type { Line, Station, TrainType } from '~/@types/graphql';
import { Heading } from '~/components/Heading';
import { LED_THEME_BG_COLOR } from '~/constants';
import {
  useBounds,
  useGetStationsWithTermination,
  useLoopLine,
  usePresetStops,
  useSavedRoutes,
} from '~/hooks';
import { directionToDirectionName, type LineDirection } from '~/models/Bound';
import type {
  SavedRoute,
  SavedRouteWithoutTrainTypeInput,
  SavedRouteWithTrainTypeInput,
} from '~/models/SavedRoute';
import notifyState from '~/store/atoms/notify';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { isJapanese, translate } from '~/translation';
import getIsPass from '~/utils/isPass';
import isTablet from '~/utils/isTablet';
import { getLocalizedLineName, isBusLine } from '~/utils/line';
import { RFValue } from '~/utils/rfValue';
import { showToast } from '~/utils/toast';
import Button from '../components/Button';
import { navigationRef } from '../stacks/rootNavigation';
import lineState from '../store/atoms/line';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { CommonCard } from './CommonCard';
import { CustomModal } from './CustomModal';
import { RouteInfoModal } from './RouteInfoModal';
import {
  type DirectionOption,
  SavePresetNameModal,
} from './SavePresetNameModal';
import { SelectBoundSettingListModal } from './SelectBoundSettingListModal';
import { TrainTypeListModal } from './TrainTypeListModal';

const styles = StyleSheet.create({
  contentView: {
    width: '100%',
  },
  boundCardsContainer: {
    gap: 8,
  },
  boundCardsDisabled: {
    opacity: 0.5,
  },
  stopsContainer: { gap: 14, marginTop: 24 },
  buttonsContainer: {
    gap: 8,
    marginTop: 24,
    width: '100%',
    paddingHorizontal: 24,
  },
  container: {
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 80,
  },
  headerContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    zIndex: 1,
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
  menuNotice: {
    fontWeight: 'bold',
    marginTop: 12,
    fontSize: RFValue(18),
    textAlign: 'center',
  },
  redOutlinedButton: {
    borderColor: '#ff3b30',
  },
  redOutlinedButtonText: {
    color: '#ff3b30',
  },
  closeButtonContainer: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: '100%',
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  closeButton: { width: '100%' },
  closeButtonText: { fontWeight: 'bold' },
  heading: { width: '100%' },
  headerText: { color: '#111' },
});

type RenderButtonProps = {
  boundStations: Station[];
  direction: LineDirection;
  loading: boolean;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  /** 閉じるアニメーションが完了した後に呼ばれるコールバック */
  onCloseAnimationEnd?: () => void;
  loading: boolean;
  error: Error | null;
  onTrainTypeSelect: (trainType: TrainType) => void;
  onBoundSelect: () => void;
  /** 方面選択を片方向のみに絞るための目的地（終点としては扱わない） */
  targetDestination?: Station | null;
};

export const SelectBoundModal: React.FC<Props> = ({
  visible,
  onClose,
  onCloseAnimationEnd,
  loading,
  error,
  onTrainTypeSelect,
  onBoundSelect,
  targetDestination,
}) => {
  const [savedRoute, setSavedRoute] = useState<SavedRoute | null>(null);
  const [isTrainTypeModalVisible, setIsTrainTypeModalVisible] = useState(false);
  const [routeInfoModalVisible, setRouteInfoModalVisible] = useState(false);
  const [
    selectBoundSettingListModalVisible,
    setSelectBoundSettingListModalVisible,
  ] = useState(false);
  const [isPresetNameModalVisible, setIsPresetNameModalVisible] =
    useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const isTransitioningRef = useRef(false);
  const pendingTrainTypeModalRef = useRef(false);

  const navigation = useNavigation();
  const [stationAtom, setStationState] = useAtom(stationState);
  const {
    station: confirmedStation,
    pendingStation: station,
    pendingStations: stations,
    wantedDestination,
  } = stationAtom;
  const [
    { autoModeEnabled, fetchedTrainTypes, pendingTrainType },
    setNavigationState,
  ] = useAtom(navigationState);
  const [lineAtom, setLineState] = useAtom(lineState);
  const { pendingLine: line, selectedLine } = lineAtom;
  const [{ targetStationIds }, setNotifyState] = useAtom(notifyState);

  const { isLoopLine } = useLoopLine(stations, false);
  const {
    bounds: [inboundStations, outboundStations],
  } = useBounds(stations);
  const _getTerminatedStations = useGetStationsWithTermination();
  const isLEDTheme = useAtomValue(isLEDThemeAtom);

  const {
    isInitialized: isRoutesDBInitialized,
    find: findSavedRoute,
    save: saveCurrentRoute,
    remove: removeCurrentRoute,
  } = useSavedRoutes();

  useEffect(() => {
    if (!line || line.id == null || !isRoutesDBInitialized) return;

    const route = findSavedRoute({
      lineId: line.id ?? 0,
      trainTypeId: pendingTrainType?.groupId ?? null,
      wantedDestinationId: wantedDestination?.groupId ?? null,
    });
    setSavedRoute(route ?? null);
  }, [
    findSavedRoute,
    line,
    pendingTrainType?.groupId,
    wantedDestination?.groupId,
    isRoutesDBInitialized,
  ]);

  useEffect(() => {
    if (!visible) {
      setIsTransitioning(false);
      isTransitioningRef.current = false;
    }
  }, [visible]);

  // pendingStation が区間外の場合、stations の先頭駅にフォールバック
  const effectiveStation =
    station && stations.some((s) => s.groupId === station.groupId)
      ? station
      : (stations[0] ?? null);

  // wantedDestinationが現在のstationsに存在しない場合（乗換先の路線など）は
  // 表示上無効として扱い、通常の方面表示にする
  const applicableWantedDestination = useMemo(
    () =>
      wantedDestination &&
      stations.some((s) => s.groupId === wantedDestination.groupId)
        ? wantedDestination
        : null,
    [wantedDestination, stations]
  );

  const effectiveStations = useMemo(() => {
    if (!applicableWantedDestination || !effectiveStation) return stations;
    const currentIdx = stations.findIndex(
      (s) => s.groupId === effectiveStation.groupId
    );
    const destIdx = stations.findIndex(
      (s) => s.groupId === applicableWantedDestination.groupId
    );
    if (currentIdx === -1 || destIdx === -1) return stations;
    return currentIdx <= destIdx
      ? stations.slice(0, destIdx + 1)
      : stations.slice(destIdx);
  }, [stations, applicableWantedDestination, effectiveStation]);

  const currentIndex = stations.findIndex(
    (s) => s.groupId === effectiveStation?.groupId
  );

  const navigateToMain = useCallback(() => {
    if (navigationRef.isReady()) {
      navigationRef.dispatch(
        CommonActions.navigate({
          name: 'MainStack',
          params: { screen: 'Main' },
        })
      );
      return;
    }

    navigation.navigate('Main' as never);
  }, [navigation]);

  const {
    presetOrigin,
    presetStops,
    nearestPresetStation,
    resolvePresetDirection,
  } = usePresetStops({
    savedRouteDirection: savedRoute?.direction,
    stations,
    wantedDestination: applicableWantedDestination,
    confirmedStation,
  });

  const handleBoundSelected = useCallback(
    (
      selectedStation: Station,
      direction: LineDirection,
      terminateBySelectedStation = false,
      stopsOverride?: Station[]
    ) => {
      if (isTransitioningRef.current) return;
      isTransitioningRef.current = true;
      setIsTransitioning(true);

      let stops = stopsOverride ?? stations;
      if (!stopsOverride && terminateBySelectedStation && effectiveStation) {
        const destIdx = stations.findIndex(
          (s) => s.groupId === selectedStation.groupId
        );
        const currentIdx = stations.findIndex(
          (s) => s.groupId === effectiveStation.groupId
        );
        if (destIdx !== -1 && currentIdx !== -1) {
          stops =
            currentIdx <= destIdx
              ? stations.slice(0, destIdx + 1)
              : stations.slice(destIdx);
        }
      }

      const effectiveDirection = stopsOverride
        ? resolvePresetDirection(selectedStation, stops)
        : direction;

      const departureFallback =
        effectiveDirection === 'INBOUND' ? stops[0] : stops.at(-1);
      const startStation = stopsOverride
        ? (nearestPresetStation ?? departureFallback ?? effectiveStation)
        : effectiveStation;

      setLineState((prev) => ({
        ...prev,
        selectedLine: line,
        pendingLine: null,
      }));
      setStationState((prev) => ({
        ...prev,
        station: startStation,
        stations: stops,
        selectedBound:
          effectiveDirection === 'INBOUND' ? (stops.at(-1) ?? null) : stops[0],
        selectedDirection: effectiveDirection,
        pendingStation: null,
        pendingStations: [],
        wantedDestination:
          terminateBySelectedStation || stopsOverride
            ? prev.wantedDestination
            : null,
      }));
      setNavigationState((prev) => ({
        ...prev,
        leftStations: [],
        trainType: pendingTrainType,
      }));
      navigateToMain();
      onBoundSelect();
    },
    [
      navigateToMain,
      effectiveStation,
      nearestPresetStation,
      resolvePresetDirection,
      stations,
      line,
      pendingTrainType,
      setLineState,
      setStationState,
      setNavigationState,
      onBoundSelect,
    ]
  );

  const normalLineDirectionText = useCallback(
    (boundStations: Station[]) => {
      if (applicableWantedDestination) {
        return isJapanese
          ? `${applicableWantedDestination.name}方面`
          : `for ${applicableWantedDestination.nameRoman}`;
      }

      if (isJapanese) {
        return `${boundStations
          .map((s) => s.name)
          .slice(0, 2)
          .join('・')}方面`;
      }
      const names = boundStations
        .slice(0, 2)
        .map((s) => s.nameRoman)
        .filter(Boolean);
      return names.length ? `for ${names.join(' and ')}` : '';
    },
    [applicableWantedDestination]
  );

  const inboundNames = useMemo(
    () => inboundStations.map((s) => s.name).join('・'),
    [inboundStations]
  );
  const outboundNames = useMemo(
    () => outboundStations.map((s) => s.name).join('・'),
    [outboundStations]
  );
  const inboundNamesRoman = useMemo(
    () => inboundStations.map((s) => s.nameRoman).join(' and '),
    [inboundStations]
  );
  const outboundNamesRoman = useMemo(
    () => outboundStations.map((s) => s.nameRoman).join(' and '),
    [outboundStations]
  );

  const loopLineDirectionText = useCallback(
    (direction: LineDirection) => {
      const directionName = directionToDirectionName(line, direction);

      if (isJapanese) {
        if (direction === 'INBOUND') {
          return `${directionName}(${inboundNames}方面)`;
        }
        return `${directionName}(${outboundNames}方面)`;
      }
      if (direction === 'INBOUND') {
        return `for ${inboundNamesRoman}`;
      }
      return `for ${outboundNamesRoman}`;
    },
    [inboundNames, outboundNames, inboundNamesRoman, outboundNamesRoman, line]
  );

  const renderButton = useCallback(
    ({ boundStations, direction, loading }: RenderButtonProps) => {
      if (loading) {
        return (
          <SkeletonPlaceholder borderRadius={4} speed={1500}>
            <SkeletonPlaceholder.Item width="100%" height={72} />
          </SkeletonPlaceholder>
        );
      }

      const buildSubtitle = (
        lineForCard: Line,
        trainTypeForCard?: TrainType | null
      ) => {
        const lineName = getLocalizedLineName(lineForCard, isJapanese);
        if (!trainTypeForCard) {
          return lineName;
        }
        const trainTypeName =
          !isLoopLine &&
          (isJapanese ? trainTypeForCard.name : trainTypeForCard.nameRoman);
        return trainTypeName ? `${lineName} ${trainTypeName}` : lineName;
      };
      const finalStop =
        applicableWantedDestination ??
        (direction === 'INBOUND' ? boundStations[0] : boundStations.at(-1));

      const lineForCard = finalStop?.line;
      const trainTypeForCard = finalStop?.trainType;

      if (!lineForCard) {
        return <></>;
      }

      // targetDestination が設定されている場合、その方向のボタンのみ表示（終点としては扱わない）
      if (targetDestination && !isLoopLine && !applicableWantedDestination) {
        const currentStationIndex = stations.findIndex(
          (s) => s.groupId === effectiveStation?.groupId
        );
        const targetStationIndex = stations.findIndex(
          (s) => s.groupId === targetDestination.groupId
        );

        if (
          currentStationIndex !== -1 &&
          targetStationIndex !== -1 &&
          currentStationIndex !== targetStationIndex
        ) {
          const dir: LineDirection =
            currentStationIndex < targetStationIndex ? 'INBOUND' : 'OUTBOUND';
          if (direction !== dir) {
            return <></>;
          }
        }
      }

      if (applicableWantedDestination && !isLoopLine) {
        const currentStationIndex = stations.findIndex(
          (s) => s.groupId === effectiveStation?.groupId
        );
        const wantedStationIndex = stations.findIndex(
          (s) => s.groupId === applicableWantedDestination.groupId
        );

        // 現在駅が経路内にない場合は savedRoute.direction から方向を決定
        const canDetermineFromIndex =
          currentStationIndex !== -1 &&
          currentStationIndex !== wantedStationIndex;
        let dir: LineDirection = savedRoute?.direction ?? 'INBOUND';
        if (canDetermineFromIndex) {
          dir =
            currentStationIndex < wantedStationIndex ? 'INBOUND' : 'OUTBOUND';
        }

        // wantedDestination 方向のカード
        if (direction === dir && line) {
          const title = normalLineDirectionText(boundStations);
          const subtitle = buildSubtitle(lineForCard, trainTypeForCard) ?? '';
          return (
            <CommonCard
              line={lineForCard ?? line}
              onPress={() =>
                handleBoundSelected(
                  applicableWantedDestination,
                  dir,
                  true,
                  presetStops
                )
              }
              disabled={isTransitioning}
              loading={isTransitioning}
              title={title}
              subtitle={subtitle}
              targetStation={finalStop}
            />
          );
        }

        // 逆方向カード: presetOrigin がない or GPS確定駅が起点と同じ場合は非表示
        if (
          !presetOrigin ||
          confirmedStation?.groupId === presetOrigin.groupId
        ) {
          return <></>;
        }

        if (boundStations.length) {
          const reverseLineForCard =
            (presetOrigin.line as Line | undefined) ?? lineForCard;
          const reverseSubtitle =
            buildSubtitle(reverseLineForCard, presetOrigin.trainType) ?? '';
          const reverseDirForNav: LineDirection =
            savedRoute?.direction === 'INBOUND' ? 'OUTBOUND' : 'INBOUND';
          return (
            <CommonCard
              onPress={() =>
                handleBoundSelected(
                  presetOrigin,
                  reverseDirForNav,
                  false,
                  presetStops
                )
              }
              disabled={isTransitioning}
              loading={isTransitioning}
              line={reverseLineForCard}
              title={
                isJapanese
                  ? `${presetOrigin.name}方面`
                  : `for ${presetOrigin.nameRoman ?? ''}`
              }
              subtitle={reverseSubtitle}
              targetStation={presetOrigin}
            />
          );
        }
        return <></>;
      }

      if (
        !boundStations.length ||
        (direction === 'INBOUND' &&
          !isLoopLine &&
          currentIndex === stations.length - 1) ||
        (direction === 'OUTBOUND' && !isLoopLine && !currentIndex)
      ) {
        return <></>;
      }

      const boundSelectOnPress = () =>
        handleBoundSelected(boundStations[0], direction);

      const title = isLoopLine
        ? loopLineDirectionText(direction)
        : normalLineDirectionText(boundStations);
      const subtitle = buildSubtitle(lineForCard, trainTypeForCard) ?? '';

      return (
        <CommonCard
          onPress={boundSelectOnPress}
          disabled={isTransitioning}
          loading={isTransitioning}
          line={lineForCard}
          title={title}
          subtitle={subtitle}
          targetStation={boundStations[0]}
        />
      );
    },
    [
      currentIndex,
      handleBoundSelected,
      isLoopLine,
      isTransitioning,
      effectiveStation?.groupId,
      stations,
      applicableWantedDestination,
      targetDestination,
      line,
      loopLineDirectionText,
      normalLineDirectionText,
      savedRoute?.direction,
      confirmedStation?.groupId,
      presetOrigin,
      presetStops,
    ]
  );

  const toggleAutoModeEnabled = useCallback(() => {
    setNavigationState((prev) => ({
      ...prev,
      autoModeEnabled: !prev.autoModeEnabled,
    }));
  }, [setNavigationState]);

  const handleSaveRoutePress = useCallback(async () => {
    if (!line) return;

    if (savedRoute) {
      Alert.alert(
        translate('removeFromSavedRoutes'),
        translate('confirmDeleteRouteText', { routeName: savedRoute.name }),
        [
          {
            text: 'OK',
            style: 'destructive',
            onPress: async () => {
              await removeCurrentRoute(savedRoute.id);
              setSavedRoute(null);

              showToast({
                type: 'error',
                text1: translate('routeDeletedText'),
              });
            },
          },
          {
            text: translate('cancel'),
            style: 'cancel',
          },
        ]
      );
      return;
    }

    setIsPresetNameModalVisible(true);
  }, [savedRoute, removeCurrentRoute, line]);

  const presetDirectionOptions = useMemo(() => {
    if (!wantedDestination || !line || !stations.length) return undefined;
    const options: DirectionOption[] = [];
    // INBOUND: stations リスト先頭側から終点方向へ向かう列車
    const firstStation = stations[0];
    const lastStation = stations[stations.length - 1];
    if (inboundStations.length && firstStation) {
      options.push({
        direction: 'INBOUND',
        fromStation: firstStation,
        toStation: wantedDestination,
        line: (firstStation.line as Line) ?? line,
      });
    }
    // OUTBOUND: stations リスト末尾側から始点方向へ向かう列車
    if (outboundStations.length && lastStation) {
      options.push({
        direction: 'OUTBOUND',
        fromStation: lastStation,
        toStation: wantedDestination,
        line: (lastStation.line as Line) ?? line,
      });
    }
    // fromStation と toStation が同じ場合は除外
    return options.filter((o) => o.fromStation.groupId !== o.toStation.groupId);
  }, [wantedDestination, line, stations, inboundStations, outboundStations]);

  const presetDefaultName = useMemo(() => {
    const trainName = pendingTrainType
      ? ((isJapanese ? pendingTrainType.name : pendingTrainType.nameRoman) ??
        '')
      : '';
    const lineName = line ? getLocalizedLineName(line, isJapanese) : '';
    return [trainName, lineName].filter(Boolean).join(' ');
  }, [pendingTrainType, line]);

  const handlePresetNameSubmit = useCallback(
    async (name: string, direction: LineDirection | null) => {
      if (!line) return;

      // 有効な駅IDのみ保存する（wantedDestinationで区間を絞った場合に範囲外を除外）
      const validStationIds = new Set(
        effectiveStations
          .map((s) => s.id)
          .filter((id): id is number => id != null)
      );
      const filteredNotifyStationIds = targetStationIds.filter((id) =>
        validStationIds.has(id)
      );

      try {
        if (pendingTrainType?.groupId) {
          const newRoute: SavedRouteWithTrainTypeInput = {
            hasTrainType: true,
            name,
            lineId: line.id ?? 0,
            trainTypeId: pendingTrainType?.groupId,
            wantedDestinationId: wantedDestination?.groupId ?? null,
            direction,
            notifyStationIds: filteredNotifyStationIds,
            createdAt: new Date(),
          };
          setSavedRoute(await saveCurrentRoute(newRoute));
        } else {
          const newRoute: SavedRouteWithoutTrainTypeInput = {
            hasTrainType: false,
            name,
            lineId: line.id ?? 0,
            trainTypeId: null,
            wantedDestinationId: wantedDestination?.groupId ?? null,
            direction,
            notifyStationIds: filteredNotifyStationIds,
            createdAt: new Date(),
          };
          setSavedRoute(await saveCurrentRoute(newRoute));
        }

        setIsPresetNameModalVisible(false);
        showToast({
          type: 'success',
          text1: translate('routeSavedText'),
        });
      } catch (_err) {
        showToast({
          type: 'error',
          text1: translate('errorTitle'),
        });
      }
    },
    [
      saveCurrentRoute,
      line,
      pendingTrainType,
      wantedDestination?.groupId,
      targetStationIds,
      effectiveStations,
    ]
  );

  const handleToggleNotification = useCallback(
    (station: Station) => {
      if (station.id == null) return;

      const stationId = station.id;
      setNotifyState((prev) => {
        const isEnabled = prev.targetStationIds.includes(stationId);
        return {
          ...prev,
          targetStationIds: isEnabled
            ? prev.targetStationIds.filter((id) => id !== stationId)
            : [...prev.targetStationIds, stationId],
        };
      });
    },
    [setNotifyState]
  );

  const handleToggleDestination = useCallback(
    (station: Station) => {
      setStationState((prev) => ({
        ...prev,
        wantedDestination:
          prev.wantedDestination?.groupId === station.groupId ? null : station,
      }));
    },
    [setStationState]
  );

  useEffect(() => {
    if (error) {
      console.error(error);
      Alert.alert(translate('errorTitle'), translate('apiErrorText'));
    }
  }, [error]);

  const stationsWithoutPass = useMemo(
    () => stations.filter((s) => !getIsPass(s)),
    [stations]
  );

  const isBus = isBusLine(line);

  const trainTypeModalLine = useMemo(() => {
    const stationLines = station?.lines ?? [];
    const hasStationLine = (targetLine: Line | null | undefined) =>
      !!targetLine &&
      stationLines.some((stationLine) => stationLine.id === targetLine.id);

    // pendingLine（選択中の路線）をselectedLine（前回確定した路線）より優先する
    // 路線選択画面から別の路線を選び直した場合にselectedLineが古い値のまま残るため
    if (hasStationLine(line)) {
      return line;
    }
    if (hasStationLine(selectedLine)) {
      return selectedLine;
    }
    if (hasStationLine(station?.line)) {
      return station?.line ?? null;
    }
    if (hasStationLine(pendingTrainType?.line)) {
      return pendingTrainType?.line ?? null;
    }

    return station?.line ?? stationLines[0] ?? line ?? selectedLine ?? null;
  }, [
    line,
    pendingTrainType?.line,
    selectedLine,
    station?.line,
    station?.lines,
  ]);

  return (
    <>
      <CustomModal
        visible={visible}
        onClose={onClose}
        onCloseAnimationEnd={onCloseAnimationEnd}
        dismissOnBackdropPress={!loading && !isTransitioning}
        backdropStyle={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        contentContainerStyle={[
          styles.contentView,
          {
            backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : '#fff',
            borderRadius: isLEDTheme ? 0 : 8,
          },
          isTablet && {
            width: '80%',
            maxHeight: '90%',
            shadowOpacity: 0.25,
            shadowColor: '#333',
            borderRadius: isLEDTheme ? 0 : 16,
          },
        ]}
      >
        <View
          style={[
            styles.headerContainer,
            { backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : undefined },
          ]}
        >
          {Platform.OS === 'ios' && !isLEDTheme ? (
            <BlurView
              intensity={80}
              tint="light"
              style={StyleSheet.absoluteFill}
            />
          ) : Platform.OS === 'android' && !isLEDTheme ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: 'rgba(255,255,255,0.92)' },
              ]}
            />
          ) : null}
          <Heading style={[styles.heading, !isLEDTheme && styles.headerText]}>
            {translate('selectBoundTitle')}
          </Heading>
        </View>
        <ScrollView
          contentContainerStyle={styles.container}
          scrollIndicatorInsets={{ top: 48, bottom: 72 }}
        >
          <View style={styles.buttonsContainer}>
            <View
              pointerEvents={isTransitioning ? 'none' : 'auto'}
              style={[
                styles.boundCardsContainer,
                isTransitioning && styles.boundCardsDisabled,
              ]}
            >
              {inboundStations.length
                ? renderButton({
                    boundStations: inboundStations,
                    direction: 'INBOUND',
                    loading,
                  })
                : null}
              {outboundStations.length
                ? renderButton({
                    boundStations: outboundStations,
                    direction: 'OUTBOUND',
                    loading,
                  })
                : null}
            </View>

            <View style={styles.stopsContainer}>
              <Button
                outline
                onPress={() => setRouteInfoModalVisible(true)}
                disabled={loading || isTransitioning}
              >
                {isBus
                  ? translate('viewBusStops')
                  : translate('viewStopStations')}
              </Button>

              <Button
                outline
                style={savedRoute ? styles.redOutlinedButton : null}
                textStyle={savedRoute ? styles.redOutlinedButtonText : null}
                onPress={handleSaveRoutePress}
                disabled={
                  !line || !isRoutesDBInitialized || loading || isTransitioning
                }
              >
                {translate(
                  !savedRoute ? 'saveCurrentRoute' : 'removeFromSavedRoutes'
                )}
              </Button>
              <Button
                outline
                onPress={() => setSelectBoundSettingListModalVisible(true)}
                disabled={isTransitioning}
              >
                {translate(
                  fetchedTrainTypes.length > 1
                    ? 'settingsAndTrainType'
                    : 'settings'
                )}
              </Button>
            </View>
          </View>
        </ScrollView>
        <View
          style={[
            styles.closeButtonContainer,
            { backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : undefined },
          ]}
        >
          {Platform.OS === 'ios' && !isLEDTheme ? (
            <BlurView
              intensity={80}
              tint="light"
              style={StyleSheet.absoluteFill}
            />
          ) : Platform.OS === 'android' && !isLEDTheme ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: 'rgba(255,255,255,0.92)' },
              ]}
            />
          ) : null}
          <Button
            style={styles.closeButton}
            textStyle={styles.closeButtonText}
            onPress={onClose}
            disabled={loading || isTransitioning}
          >
            {translate('close')}
          </Button>
        </View>
      </CustomModal>

      <RouteInfoModal
        visible={routeInfoModalVisible}
        trainType={pendingTrainType}
        stations={stationsWithoutPass}
        onClose={() => setRouteInfoModalVisible(false)}
        loading={loading}
        targetStationIds={targetStationIds}
        onToggleNotification={handleToggleNotification}
        wantedDestinationGroupId={wantedDestination?.groupId ?? null}
        onToggleDestination={handleToggleDestination}
      />
      <SelectBoundSettingListModal
        visible={selectBoundSettingListModalVisible}
        onClose={() => setSelectBoundSettingListModalVisible(false)}
        autoModeEnabled={autoModeEnabled}
        toggleAutoModeEnabled={toggleAutoModeEnabled}
        trainTypeName={
          pendingTrainType
            ? isJapanese
              ? (pendingTrainType.name ?? '')
              : (pendingTrainType.nameRoman ?? '')
            : undefined
        }
        trainTypeColor={pendingTrainType?.color ?? undefined}
        trainTypeLoading={loading}
        onTrainTypePress={() => {
          pendingTrainTypeModalRef.current = true;
          setSelectBoundSettingListModalVisible(false);
        }}
        onCloseAnimationEnd={() => {
          if (pendingTrainTypeModalRef.current) {
            pendingTrainTypeModalRef.current = false;
            setIsTrainTypeModalVisible(true);
          }
        }}
        trainTypeDisabled={fetchedTrainTypes.length <= 1}
      />
      <TrainTypeListModal
        visible={isTrainTypeModalVisible}
        line={trainTypeModalLine}
        destination={targetDestination ?? wantedDestination}
        onClose={() => {
          setIsTrainTypeModalVisible(false);
        }}
        onSelect={(trainType) => {
          setIsTrainTypeModalVisible(false);
          setStationState((prev) => ({ ...prev, wantedDestination: null }));
          onTrainTypeSelect(trainType);
        }}
      />
      {/*
        Keep the preset-name modal outside the parent modal tree to avoid
        nested modal lifecycle glitches on iOS during route-save updates.
      */}
      <SavePresetNameModal
        visible={isPresetNameModalVisible}
        onClose={() => setIsPresetNameModalVisible(false)}
        onSubmit={handlePresetNameSubmit}
        defaultName={presetDefaultName}
        directionOptions={presetDirectionOptions}
      />
    </>
  );
};
