import { useNavigation } from '@react-navigation/native';
import { useAtom, useSetAtom } from 'jotai';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import {
  Line,
  type Station,
  StopCondition,
  TrainType,
} from '~/gen/proto/stationapi_pb';
import type {
  SavedRoute,
  SavedRouteWithoutTrainTypeInput,
  SavedRouteWithTrainTypeInput,
} from '~/models/SavedRoute';
import { APP_THEME } from '~/models/Theme';
import { isDevApp } from '~/utils/isDevApp';
import isTablet from '~/utils/isTablet';
import Button from '../components/Button';
import { Heading } from '../components/Heading';
import { LED_THEME_BG_COLOR, TOEI_OEDO_LINE_ID } from '../constants';
import {
  useBounds,
  useGetStationsWithTermination,
  useLoopLine,
  useSavedRoutes,
  useThemeStore,
} from '../hooks';
import { directionToDirectionName, type LineDirection } from '../models/Bound';
import lineState from '../store/atoms/line';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { isJapanese, translate } from '../translation';
import { RFValue } from '../utils/rfValue';
import ErrorScreen from './ErrorScreen';

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
  buttons: {
    marginTop: 12,
    justifyContent: 'center',
    alignItems: 'center',
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
});

type RenderButtonProps = {
  boundStations: Station[];
  direction: LineDirection;
  loading: boolean;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  station: Station | null;
  line: Line | null;
  stations: Station[];
  trainType: TrainType | null;
  destination: Station | null;
  loading: boolean;
  error: Error | null;
};

export const SelectBoundModal: React.FC<Props> = ({
  visible,
  onClose,
  line,
  station,
  stations,
  trainType,
  destination: wantedDestination,
  loading,
  error,
}) => {
  const [savedRoute, setSavedRoute] = useState<SavedRoute | null>(null);

  const navigation = useNavigation();
  const setStationState = useSetAtom(stationState);
  const [{ fetchedTrainTypes, autoModeEnabled }, setNavigationState] =
    useAtom(navigationState);
  const setLineState = useSetAtom(lineState);
  const { isLoopLine } = useLoopLine(stations);
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
    if (!line || !isRoutesDBInitialized) return;

    const route = findSavedRoute({
      lineId: line.id,
      trainTypeId: trainType?.groupId ?? null,
      destinationStationId: wantedDestination?.groupId ?? null,
    });
    setSavedRoute(route ?? null);
  }, [
    findSavedRoute,
    line,
    trainType?.groupId,
    wantedDestination?.groupId,
    isRoutesDBInitialized,
  ]);

  // 種別選択ボタンを表示するかのフラグ
  const withTrainTypes = useMemo(
    (): boolean => fetchedTrainTypes.length > 1,
    [fetchedTrainTypes]
  );

  const currentIndex = stations.findIndex(
    (s) => s.groupId === station?.groupId
  );

  const handleSelectBoundBackButtonPress = useCallback(() => {
    setStationState((prev) => ({
      ...prev,
      stations: [],
      wantedDestination: null,
    }));
    setNavigationState((prev) => ({
      ...prev,
      headerState: isJapanese ? 'CURRENT' : 'CURRENT_EN',
      trainType: null,
      bottomState: 'LINE',
      leftStations: [],
      fetchedTrainTypes: [],
    }));
    onClose();
  }, [setNavigationState, setStationState, onClose]);

  const handleBoundSelected = useCallback(
    (selectedStation: Station, direction: LineDirection) => {
      const oedoLineTerminus =
        direction === 'INBOUND' ? stations[stations.length - 1] : stations[0];

      setLineState((prev) => ({ ...prev, selectedLine: line }));
      setStationState((prev) => ({
        ...prev,
        station,
        stations,
        selectedBound:
          line?.id === TOEI_OEDO_LINE_ID ? oedoLineTerminus : selectedStation,
        selectedDirection: direction,
      }));
      onClose();
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
      onClose,
    ]
  );
  const handleNotificationButtonPress = (): void => {
    navigation.navigate('Notification' as never);
  };

  const handleTrainTypeButtonPress = (): void => {
    navigation.navigate('TrainType' as never);
  };

  const handleAllStopsButtonPress = useCallback(() => {
    const stopStations = stations.filter(
      (s) => s.stopCondition !== StopCondition.Not
    );
    Alert.alert(
      translate('viewStopStations'),
      Array.from(
        new Set(stopStations.map((s) => (isJapanese ? s.name : s.nameRoman)))
      ).join(isJapanese ? '、' : ', ')
    );
  }, [stations]);

  const handleSpecifyDestinationButtonPress = useCallback(() => {
    navigation.navigate('SpecifyDestinationSettings' as never);
  }, [navigation]);

  const handleWantedDestinationPress = useCallback(
    (destination: Station, direction: LineDirection) => {
      const stationLineIds = Array.from(
        new Set(stations.map((s) => s.line?.id).filter((id) => id))
      );

      const updatedTrainType: TrainType | null = trainType
        ? new TrainType({
            ...trainType,
            lines: (trainType.lines || [])
              .filter((l) => stationLineIds.includes(l.id))
              .map((l) => new Line(l)),
          })
        : null;
      setStationState((prev) => ({
        ...prev,
        selectedBound: destination,
        selectedDirection: direction,
        stations: getTerminatedStations(destination, stations),
      }));
      setNavigationState((prev) => ({ ...prev, trainType: updatedTrainType }));
      requestAnimationFrame(() => {
        navigation.navigate('Main' as never);
      });
    },
    [
      navigation,
      setNavigationState,
      setStationState,
      stations,
      trainType,
      getTerminatedStations,
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
            <SkeletonPlaceholder.Item width="100%" height={34} />
          </SkeletonPlaceholder>
        );
      }

      if (wantedDestination) {
        const currentStationIndex = stations.findIndex(
          (s) => s.groupId === station?.groupId
        );
        const wantedStationIndex = stations.findIndex(
          (s) => s.groupId === wantedDestination.groupId
        );
        const dir =
          currentStationIndex < wantedStationIndex ? 'INBOUND' : 'OUTBOUND';
        if (direction === dir) {
          return (
            <Button
              color="#008ffe"
              onPress={() =>
                handleWantedDestinationPress(wantedDestination, dir)
              }
            >
              {isJapanese
                ? `${wantedDestination.name}方面`
                : `for ${wantedDestination.nameRoman}`}
            </Button>
          );
        }
        return null;
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

      const directionText = isLoopLine
        ? loopLineDirectionText(direction)
        : normalLineDirectionText(boundStations);

      const boundSelectOnPress = () =>
        handleBoundSelected(boundStations[0], direction);
      return (
        <Button color="#008ffe" onPress={boundSelectOnPress}>
          {directionText}
        </Button>
      );
    },
    [
      currentIndex,
      handleBoundSelected,
      handleWantedDestinationPress,
      isLoopLine,
      loopLineDirectionText,
      normalLineDirectionText,
      station?.groupId,
      stations,
      wantedDestination,
    ]
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: 確実にアンマウント時に動かしたい
  useEffect(() => {
    return () => {
      handleSelectBoundBackButtonPress();
    };
  }, []);

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
      const trainTypeName = isJapanese
        ? trainType.name
        : (trainType.nameRoman ?? '');
      const newRoute: SavedRouteWithTrainTypeInput = {
        hasTrainType: true,
        name: wantedDestination
          ? `${lineName} ${trainTypeName} ${edgeStationNames} ${isJapanese ? `${wantedDestination.name}ゆき` : `for ${wantedDestination.nameRoman}`}`.trim()
          : `${lineName} ${trainTypeName} ${edgeStationNames}`.trim(),
        lineId: line.id,
        trainTypeId: trainType?.groupId,
        destinationStationId: wantedDestination?.groupId ?? null,
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
      ? wantedDestination?.name
      : wantedDestination?.nameRoman;
    const newRoute: SavedRouteWithoutTrainTypeInput = {
      hasTrainType: false,

      name: isJapanese
        ? `${lineName} 各駅停車 ${edgeStationNames} ${destinationName ? `${destinationName}行き` : ''}`.trim()
        : `${lineName} Local ${edgeStationNames}${destinationName ? ` for ${destinationName}` : ''}`.trim(),
      lineId: line.id,
      trainTypeId: null,
      destinationStationId: wantedDestination?.groupId ?? null,
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
    wantedDestination,
    line,
    trainType,
    stations,
  ]);

  if (error) {
    return (
      <ErrorScreen
        showStatus
        title={translate('errorTitle')}
        text={translate('apiErrorText')}
        isFetching={loading}
      />
    );
  }

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
              shadowColor: '#000',
              borderRadius: 16,
            },
          ]}
        >
          <View style={styles.container}>
            <Heading>{translate('selectBoundTitle')}</Heading>

            <View style={{ gap: 8, marginTop: 24 }}>
              {renderButton({
                boundStations: inboundStations,
                direction: 'INBOUND',
                loading,
              })}
              {renderButton({
                boundStations: outboundStations,
                direction: 'OUTBOUND',
                loading,
              })}

              <View style={{ gap: 8, marginTop: 12 }}>
                <Button onPress={handleNotificationButtonPress}>
                  {translate('notifySettings')}
                </Button>
                {withTrainTypes ? (
                  <Button onPress={handleTrainTypeButtonPress}>
                    {translate('trainTypeSettings')}
                  </Button>
                ) : null}
                <Button onPress={handleAllStopsButtonPress}>
                  {translate('viewStopStations')}
                </Button>
                {/* NOTE: 処理が複雑になりそこまで需要もなさそうなので環状運転路線では行先を指定できないようにする */}
                {!isLoopLine ? (
                  <Button onPress={handleSpecifyDestinationButtonPress}>
                    {translate('selectBoundSettings')}
                  </Button>
                ) : null}
                <Button onPress={toggleAutoModeEnabled}>
                  {translate('autoModeSettings')}:{' '}
                  {autoModeEnabled ? 'ON' : 'OFF'}
                </Button>
                {isDevApp && (
                  <Button
                    onPress={handleSaveRoutePress}
                    disabled={!line || !isRoutesDBInitialized}
                  >
                    {translate(
                      !savedRoute ? 'saveCurrentRoute' : 'removeFromSavedRoutes'
                    )}
                  </Button>
                )}
              </View>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
