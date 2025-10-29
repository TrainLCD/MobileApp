import { useNavigation } from '@react-navigation/native';
import { useAtom } from 'jotai';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import type { Station, TrainType } from '~/@types/graphql';
import { Heading } from '~/components/Heading';
import { LED_THEME_BG_COLOR, TOEI_OEDO_LINE_ID } from '~/constants';
import {
  useBounds,
  useGetStationsWithTermination,
  useLoopLine,
  useSavedRoutes,
  useThemeStore,
} from '~/hooks';
import { directionToDirectionName, type LineDirection } from '~/models/Bound';
import type {
  SavedRoute,
  SavedRouteWithoutTrainTypeInput,
  SavedRouteWithTrainTypeInput,
} from '~/models/SavedRoute';
import { APP_THEME } from '~/models/Theme';
import { isJapanese, translate } from '~/translation';
import isTablet from '~/utils/isTablet';
import { RFValue } from '~/utils/rfValue';
import Button from '../components/Button';
import lineState from '../store/atoms/line';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { LineCard } from './LineCard';
import { RouteInfoModal } from './RouteInfoModal';
import { SelectBoundSettingListModal } from './SelectBoundSettingListModal';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 24,
  },
  contentView: {
    width: '100%',
    paddingVertical: 24,
    borderRadius: 8,
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
  loading: boolean;
  error: Error | null;
  terminateByDestination?: boolean;
  onTrainTypeSelect: (trainType: TrainType) => void;
  onBoundSelect: () => void;
};

export const SelectBoundModal: React.FC<Props> = ({
  visible,
  onClose,
  loading,
  error,
  terminateByDestination,
  onTrainTypeSelect,
  onBoundSelect,
}) => {
  const [savedRoute, setSavedRoute] = useState<SavedRoute | null>(null);

  const [routeInfoModalVisible, setRouteInfoModalVisible] = useState(false);
  const [
    selectBoundSettingListModalVisible,
    setSelectBoundSettingListModalVisible,
  ] = useState(false);

  const navigation = useNavigation();
  const [stationAtom, setStationState] = useAtom(stationState);
  const { pendingStation: station, pendingStations: stations } = stationAtom;
  const [
    { autoModeEnabled, trainType, pendingWantedDestination },
    setNavigationState,
  ] = useAtom(navigationState);
  const [lineAtom, setLineState] = useAtom(lineState);
  const { pendingLine: line } = lineAtom;
  const { isLoopLine } = useLoopLine(stations, false);
  const {
    bounds: [inboundStations, outboundStations],
  } = useBounds(stations);
  const getTerminatedStations = useGetStationsWithTermination();
  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED);

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
      trainTypeId: trainType?.groupId ?? null,
    });
    setSavedRoute(route ?? null);
  }, [findSavedRoute, line, trainType?.groupId, isRoutesDBInitialized]);

  const currentIndex = stations.findIndex(
    (s) => s.groupId === station?.groupId
  );

  const handleBoundSelected = useCallback(
    (
      selectedStation: Station,
      direction: LineDirection,
      terminateBySelectedStation = false
    ) => {
      const oedoLineTerminus =
        direction === 'INBOUND' ? stations[stations.length - 1] : stations[0];

      setLineState((prev) => ({
        ...prev,
        selectedLine: line,
        pendingLine: null,
      }));
      setStationState((prev) => ({
        ...prev,
        station,
        stations: terminateBySelectedStation
          ? getTerminatedStations(selectedStation, stations)
          : stations,
        selectedBound:
          line?.id === TOEI_OEDO_LINE_ID && !terminateBySelectedStation
            ? oedoLineTerminus
            : direction === 'INBOUND'
              ? stations[stations.length - 1]
              : stations[0],
        selectedDirection: direction,
        pendingStation: null,
        pendingStations: [],
      }));
      setNavigationState((prev) => ({
        ...prev,
        pendingWantedDestination: null,
      }));
      onBoundSelect();
      requestAnimationFrame(() => {
        navigation.navigate('Main' as never);
      });
    },
    [
      navigation,
      station,
      line,
      setLineState,
      setStationState,
      stations,
      onBoundSelect,
      getTerminatedStations,
      setNavigationState,
    ]
  );

  const normalLineDirectionText = useCallback((boundStations: Station[]) => {
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
  }, []);

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

      const lineForCard =
        direction === 'INBOUND'
          ? (boundStations[0]?.line ?? line)
          : boundStations[boundStations.length - 1]?.line;
      const trainTypeForCard =
        (direction === 'INBOUND'
          ? boundStations[0]?.trainType
          : boundStations[boundStations.length - 1]?.trainType) ?? trainType;

      if (!lineForCard) {
        return <></>;
      }

      if (pendingWantedDestination && !isLoopLine) {
        const currentStationIndex = stations.findIndex(
          (s) => s.groupId === station?.groupId
        );
        const wantedStationIndex = stations.findIndex(
          (s) => s.groupId === pendingWantedDestination.groupId
        );
        const dir: LineDirection =
          currentStationIndex < wantedStationIndex ? 'INBOUND' : 'OUTBOUND';

        if (direction === dir && line) {
          const title = isLoopLine
            ? loopLineDirectionText(direction)
            : normalLineDirectionText(boundStations);
          const subtitle = isJapanese
            ? `${lineForCard.nameShort} ${!isLoopLine && trainTypeForCard ? `${trainTypeForCard.name}` : ''}`
            : `${lineForCard.nameRoman} ${!isLoopLine && trainTypeForCard ? `${trainTypeForCard.nameRoman}` : ''}`;

          return (
            <LineCard
              line={lineForCard ?? line}
              onPress={() =>
                handleBoundSelected(
                  pendingWantedDestination,
                  dir,
                  terminateByDestination
                )
              }
              title={title}
              subtitle={subtitle}
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
      const subtitle = isJapanese
        ? `${lineForCard.nameShort} ${!isLoopLine && trainTypeForCard ? `${trainTypeForCard.name}` : ''}`
        : `${lineForCard.nameRoman} ${!isLoopLine && trainTypeForCard ? `${trainTypeForCard.nameRoman}` : ''}`;

      return (
        <LineCard
          onPress={boundSelectOnPress}
          line={lineForCard}
          title={title}
          subtitle={subtitle}
        />
      );
    },
    [
      currentIndex,
      handleBoundSelected,
      isLoopLine,
      station?.groupId,
      stations,
      pendingWantedDestination,
      line,
      terminateByDestination,
      trainType,
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
              Alert.alert(
                translate('announcementTitle'),
                translate('routeDeletedText', {
                  routeName: savedRoute.name,
                })
              );
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

    const lineName = isJapanese
      ? line.nameShort
      : (line.nameRoman ?? line.nameShort);
    const edgeStationNames = isJapanese
      ? `${stations[0]?.name ?? ''}〜${stations[stations.length - 1]?.name ?? ''}`
      : `${stations[0]?.nameRoman ?? ''} - ${stations[stations.length - 1]?.nameRoman ?? ''}`;

    if (trainType?.groupId) {
      const trainTypeName =
        (isJapanese ? trainType.name : trainType.nameRoman) ?? '';
      const newRoute: SavedRouteWithTrainTypeInput = {
        hasTrainType: true,
        name: pendingWantedDestination
          ? `${lineName} ${trainTypeName} ${edgeStationNames} ${isJapanese ? `${pendingWantedDestination.name}ゆき` : `for ${pendingWantedDestination.nameRoman}`}`.trim()
          : `${lineName} ${trainTypeName} ${edgeStationNames}`.trim(),
        lineId: line.id ?? 0,
        trainTypeId: trainType?.groupId,
        createdAt: new Date(),
      };
      setSavedRoute(await saveCurrentRoute(newRoute));
      Alert.alert(
        translate('announcementTitle'),
        translate('routeSavedText', {
          routeName: newRoute.name,
        })
      );
      return;
    }

    const destinationName = isJapanese
      ? pendingWantedDestination?.name
      : pendingWantedDestination?.nameRoman;
    const newRoute: SavedRouteWithoutTrainTypeInput = {
      hasTrainType: false,

      name: isJapanese
        ? `${lineName} 各駅停車 ${edgeStationNames} ${destinationName ? `${destinationName}行き` : ''}`.trim()
        : `${lineName} Local ${edgeStationNames}${destinationName ? ` for ${destinationName}` : ''}`.trim(),
      lineId: line.id ?? 0,
      trainTypeId: null,
      createdAt: new Date(),
    };

    setSavedRoute(await saveCurrentRoute(newRoute));
    Alert.alert(
      translate('announcementTitle'),
      translate('routeSavedText', {
        routeName: newRoute.name,
      })
    );
  }, [
    savedRoute,
    removeCurrentRoute,
    saveCurrentRoute,
    pendingWantedDestination,
    line,
    trainType,
    stations,
  ]);

  useEffect(() => {
    if (error) {
      console.error(error);
      Alert.alert(translate('errorTitle'), translate('apiErrorText'));
    }
  }, [error]);

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
      supportedOrientations={['portrait', 'landscape']}
    >
      <Pressable style={styles.root} onPress={onClose}>
        <Pressable
          style={[
            styles.contentView,
            {
              backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : '#fff',
            },
            isTablet && {
              width: '80%',
              maxHeight: '90%',
              shadowOpacity: 0.25,
              shadowColor: '#333',
              borderRadius: 16,
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
                  {translate('viewStopStations')}
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
        </Pressable>
      </Pressable>

      <RouteInfoModal
        visible={routeInfoModalVisible}
        trainType={trainType}
        stations={stations}
        onClose={() => setRouteInfoModalVisible(false)}
        loading={loading}
        error={error}
      />
      <SelectBoundSettingListModal
        visible={selectBoundSettingListModalVisible}
        onClose={() => setSelectBoundSettingListModalVisible(false)}
        isLoopLine={isLoopLine}
        autoModeEnabled={autoModeEnabled}
        toggleAutoModeEnabled={toggleAutoModeEnabled}
        line={line}
        onTrainTypeSelect={onTrainTypeSelect}
      />
    </Modal>
  );
};
