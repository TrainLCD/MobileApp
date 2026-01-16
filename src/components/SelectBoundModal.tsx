import { useNavigation } from '@react-navigation/native';
import { useAtom, useAtomValue } from 'jotai';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import type { Line, Station, TrainType } from '~/@types/graphql';
import { Heading } from '~/components/Heading';
import { LED_THEME_BG_COLOR } from '~/constants';
import {
  useBounds,
  useGetStationsWithTermination,
  useLoopLine,
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
import { isBusLine } from '~/utils/line';
import { RFValue } from '~/utils/rfValue';
import { showToast } from '~/utils/toast';
import Button from '../components/Button';
import lineState from '../store/atoms/line';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { CommonCard } from './CommonCard';
import { CustomModal } from './CustomModal';
import { RouteInfoModal } from './RouteInfoModal';
import { SelectBoundSettingListModal } from './SelectBoundSettingListModal';
import { StationSettingsModal } from './StationSettingsModal';
import { TrainTypeListModal } from './TrainTypeListModal';

const styles = StyleSheet.create({
  contentView: {
    width: '100%',
    paddingVertical: 24,
    minHeight: 256,
  },
  stopsContainer: { gap: 14, marginTop: 24 },
  buttonsContainer: {
    gap: 8,
    marginTop: 24,
    width: '100%',
    paddingHorizontal: 24,
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
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
  closeButton: { marginTop: 24 },
  closeButtonText: { fontWeight: 'bold' },
  heading: { width: '100%', marginLeft: 48 },
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
  const [isStationSettingsModalVisible, setIsStationSettingsModalVisible] =
    useState(false);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);

  const navigation = useNavigation();
  const [stationAtom, setStationState] = useAtom(stationState);
  const {
    pendingStation: station,
    pendingStations: stations,
    wantedDestination,
  } = stationAtom;
  const [
    { autoModeEnabled, fetchedTrainTypes, pendingTrainType },
    setNavigationState,
  ] = useAtom(navigationState);
  const [lineAtom, setLineState] = useAtom(lineState);
  const { pendingLine: line } = lineAtom;
  const [{ targetStationIds }, setNotifyState] = useAtom(notifyState);

  const { isLoopLine } = useLoopLine(stations, false);
  const {
    bounds: [inboundStations, outboundStations],
  } = useBounds(stations);
  const getTerminatedStations = useGetStationsWithTermination();
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
    });
    setSavedRoute(route ?? null);
  }, [findSavedRoute, line, pendingTrainType?.groupId, isRoutesDBInitialized]);

  const currentIndex = stations.findIndex(
    (s) => s.groupId === station?.groupId
  );

  const handleBoundSelected = useCallback(
    (
      selectedStation: Station,
      direction: LineDirection,
      terminateBySelectedStation = false
    ) => {
      const stops = terminateBySelectedStation
        ? getTerminatedStations(selectedStation, stations)
        : stations;

      setLineState((prev) => ({
        ...prev,
        selectedLine: line,
        pendingLine: null,
      }));
      setStationState((prev) => ({
        ...prev,
        station,
        stations: stops,
        selectedBound:
          direction === 'INBOUND' ? stops[stops.length - 1] : stops[0],
        selectedDirection: direction,
        pendingStation: null,
        pendingStations: [],
        wantedDestination: null,
      }));
      setNavigationState((prev) => ({
        ...prev,
        leftStations: [],
        trainType: pendingTrainType,
      }));
      onBoundSelect();
      requestAnimationFrame(() => {
        navigation.navigate('Main' as never);
      });
    },
    [
      navigation,
      station,
      stations,
      line,
      pendingTrainType,
      setLineState,
      setStationState,
      setNavigationState,
      onBoundSelect,
      getTerminatedStations,
    ]
  );

  const handleStationSelected = useCallback((station: Station) => {
    setSelectedStation(station);
    setIsStationSettingsModalVisible(true);
  }, []);

  const normalLineDirectionText = useCallback(
    (boundStations: Station[]) => {
      if (wantedDestination) {
        return isJapanese
          ? `${wantedDestination.name}方面`
          : `for ${wantedDestination.nameRoman}`;
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
    [wantedDestination]
  );

  const loopLineDirectionText = useCallback(
    (direction: LineDirection) => {
      const directionName = directionToDirectionName(line, direction);

      if (isJapanese) {
        if (direction === 'INBOUND') {
          return `${directionName}(${inboundStations
            .map((s) => s.name)
            .join('・')}方面)`;
        }
        return `${directionName}(${outboundStations
          .map((s) => s.name)
          .join('・')}方面)`;
      }
      if (direction === 'INBOUND') {
        return `for ${inboundStations.map((s) => s.nameRoman).join(' and ')}`;
      }
      return `for ${outboundStations.map((s) => s.nameRoman).join(' and ')}`;
    },
    [inboundStations, outboundStations, line]
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
        const lineName = isJapanese
          ? lineForCard.nameShort
          : lineForCard.nameRoman;
        const trainTypeName = trainTypeForCard
          ? isJapanese
            ? trainTypeForCard.name
            : trainTypeForCard.nameRoman
          : '';
        return `${lineName} ${!isLoopLine && trainTypeName ? trainTypeName : ''}`.trim();
      };
      const finalStop =
        wantedDestination ??
        (direction === 'INBOUND'
          ? boundStations[0]
          : boundStations[boundStations.length - 1]);

      const lineForCard = finalStop?.line;
      const trainTypeForCard = finalStop?.trainType;

      if (!lineForCard) {
        return <></>;
      }

      // targetDestination が設定されている場合、その方向のボタンのみ表示（終点としては扱わない）
      if (targetDestination && !isLoopLine && !wantedDestination) {
        const currentStationIndex = stations.findIndex(
          (s) => s.groupId === station?.groupId
        );
        const targetStationIndex = stations.findIndex(
          (s) => s.groupId === targetDestination.groupId
        );
        const dir: LineDirection =
          currentStationIndex < targetStationIndex ? 'INBOUND' : 'OUTBOUND';

        if (direction !== dir) {
          return <></>;
        }
      }

      if (wantedDestination && !isLoopLine) {
        const currentStationIndex = stations.findIndex(
          (s) => s.groupId === station?.groupId
        );
        const wantedStationIndex = stations.findIndex(
          (s) => s.groupId === wantedDestination.groupId
        );
        const dir: LineDirection =
          currentStationIndex < wantedStationIndex ? 'INBOUND' : 'OUTBOUND';

        if (direction === dir && line) {
          const title = isLoopLine
            ? loopLineDirectionText(direction)
            : normalLineDirectionText(boundStations);
          const subtitle = buildSubtitle(lineForCard, trainTypeForCard);
          return (
            <CommonCard
              line={lineForCard ?? line}
              onPress={() =>
                handleBoundSelected(wantedDestination, dir, !!wantedDestination)
              }
              title={title}
              subtitle={subtitle}
              targetStation={finalStop}
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
      const subtitle = buildSubtitle(lineForCard, trainTypeForCard);

      return (
        <CommonCard
          onPress={boundSelectOnPress}
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
      station?.groupId,
      stations,
      wantedDestination,
      targetDestination,
      line,
      loopLineDirectionText,
      normalLineDirectionText,
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

    if (pendingTrainType?.groupId) {
      const newRoute: SavedRouteWithTrainTypeInput = {
        hasTrainType: true,
        name: translate('preset'),
        lineId: line.id ?? 0,
        trainTypeId: pendingTrainType?.groupId,
        createdAt: new Date(),
      };
      setSavedRoute(await saveCurrentRoute(newRoute));

      showToast({
        type: 'success',
        text1: translate('routeSavedText'),
      });
      return;
    }

    const newRoute: SavedRouteWithoutTrainTypeInput = {
      hasTrainType: false,
      name: translate('preset'),
      lineId: line.id ?? 0,
      trainTypeId: null,
      createdAt: new Date(),
    };

    setSavedRoute(await saveCurrentRoute(newRoute));

    showToast({
      type: 'success',
      text1: translate('routeSavedText'),
    });
  }, [
    savedRoute,
    removeCurrentRoute,
    saveCurrentRoute,
    line,
    pendingTrainType,
  ]);

  const toggleNotificationModeEnabled = useCallback(() => {
    if (!selectedStation) return;

    setNotifyState((prev) => {
      const isEnabled = prev.targetStationIds.includes(
        selectedStation.id ?? -1
      );
      return {
        ...prev,
        targetStationIds: isEnabled
          ? prev.targetStationIds.filter(
              (id) => id !== (selectedStation.id ?? -1)
            )
          : [...prev.targetStationIds, selectedStation.id ?? -1],
      };
    });
  }, [selectedStation, setNotifyState]);

  useEffect(() => {
    if (error) {
      console.error(error);
      Alert.alert(translate('errorTitle'), translate('apiErrorText'));
    }
  }, [error]);

  const trainTypeText = useMemo(() => {
    if (!fetchedTrainTypes.length) {
      return translate('trainTypesNotExist');
    }

    if (!pendingTrainType) {
      return translate('trainTypeSettings');
    }

    return translate('trainTypeIs', {
      trainTypeName: isJapanese
        ? (pendingTrainType.name ?? '')
        : (pendingTrainType.nameRoman ?? ''),
    });
  }, [fetchedTrainTypes, pendingTrainType]);

  const stationsWithoutPass = useMemo(
    () => stations.filter((s) => !getIsPass(s)),
    [stations]
  );

  const isBus = isBusLine(line);

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      onCloseAnimationEnd={onCloseAnimationEnd}
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
      <View style={styles.container}>
        <Heading style={styles.heading}>
          {translate('selectBoundTitle')}
        </Heading>

        <View style={styles.buttonsContainer}>
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

          <View style={styles.stopsContainer}>
            <Button outline onPress={() => setRouteInfoModalVisible(true)}>
              {isBus
                ? translate('viewBusStops')
                : translate('viewStopStations')}
            </Button>

            <Button
              outline
              onPress={() => setIsTrainTypeModalVisible(true)}
              disabled={!fetchedTrainTypes.length}
            >
              {trainTypeText}
            </Button>

            <Button
              outline
              style={savedRoute ? styles.redOutlinedButton : null}
              textStyle={savedRoute ? styles.redOutlinedButtonText : null}
              onPress={handleSaveRoutePress}
              disabled={!line || !isRoutesDBInitialized}
            >
              {translate(
                !savedRoute ? 'saveCurrentRoute' : 'removeFromSavedRoutes'
              )}
            </Button>
            <Button
              outline
              onPress={() => setSelectBoundSettingListModalVisible(true)}
            >
              {translate('settings')}
            </Button>
          </View>

          <Button
            style={styles.closeButton}
            textStyle={styles.closeButtonText}
            onPress={onClose}
          >
            {translate('close')}
          </Button>
        </View>
      </View>

      <RouteInfoModal
        visible={routeInfoModalVisible}
        trainType={pendingTrainType}
        stations={stationsWithoutPass}
        onClose={() => setRouteInfoModalVisible(false)}
        onSelect={handleStationSelected}
        loading={loading}
      />
      <SelectBoundSettingListModal
        visible={selectBoundSettingListModalVisible}
        onClose={() => setSelectBoundSettingListModalVisible(false)}
        autoModeEnabled={autoModeEnabled}
        toggleAutoModeEnabled={toggleAutoModeEnabled}
      />
      <TrainTypeListModal
        visible={isTrainTypeModalVisible}
        line={pendingTrainType?.line ?? station?.line ?? line}
        onClose={() => {
          setIsTrainTypeModalVisible(false);
        }}
        onSelect={(trainType) => {
          setIsTrainTypeModalVisible(false);
          setStationState((prev) => ({ ...prev, wantedDestination: null }));
          onTrainTypeSelect(trainType);
        }}
      />
      <StationSettingsModal
        visible={isStationSettingsModalVisible}
        onClose={() => setIsStationSettingsModalVisible(false)}
        station={selectedStation}
        notificationModeEnabled={targetStationIds.includes(
          selectedStation?.id ?? -1
        )}
        toggleNotificationModeEnabled={toggleNotificationModeEnabled}
        isSetAsTerminus={
          wantedDestination?.groupId === selectedStation?.groupId
        }
        onDestinationSelected={() => {
          if (selectedStation) {
            setStationState((prev) => ({
              ...prev,
              wantedDestination:
                prev.wantedDestination?.groupId === selectedStation.groupId
                  ? null
                  : selectedStation,
            }));
          }
        }}
      />
    </CustomModal>
  );
};
