import { StackActions, useNavigation } from '@react-navigation/native';
import { useAtom, useAtomValue } from 'jotai';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
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
import { isDevApp } from '~/utils/isDevApp';
import Button from '../components/Button';
import ErrorScreen from '../components/ErrorScreen';
import { Heading } from '../components/Heading';
import Typography from '../components/Typography';
import { TOEI_OEDO_LINE_ID } from '../constants';
import {
  useBounds,
  useGetStationsWithTermination,
  useLoopLine,
  useSavedRoutes,
  useStationList,
} from '../hooks';
import { directionToDirectionName, type LineDirection } from '../models/Bound';
import lineState from '../store/atoms/line';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { isJapanese, translate } from '../translation';
import { RFValue } from '../utils/rfValue';

const styles = StyleSheet.create({
  boundLoading: {
    marginTop: 16,
  },
  bottom: {
    padding: 16,
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
  button: {
    marginLeft: 8,
    marginRight: 8,
  },
  horizontalButtons: {
    flexDirection: 'row',
    marginVertical: 12,
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
};

const SelectBoundScreen: React.FC = () => {
  const [savedRouteLoaded, setSavedRouteLoaded] = useState(false);
  const [savedRoute, setSavedRoute] = useState<SavedRoute | null>(null);

  const navigation = useNavigation();
  const [{ station, stations, wantedDestination }, setStationState] =
    useAtom(stationState);
  const [
    { trainType, fetchedTrainTypes, autoModeEnabled },
    setNavigationState,
  ] = useAtom(navigationState);
  const { selectedLine } = useAtomValue(lineState);

  const { loading, error, refetchStations } = useStationList();
  const { isLoopLine } = useLoopLine();
  const {
    bounds: [inboundStations, outboundStations],
  } = useBounds();
  const getTerminatedStations = useGetStationsWithTermination();

  const {
    find: findSavedRoute,
    save: saveCurrentRoute,
    remove: removeCurrentRoute,
  } = useSavedRoutes();

  useEffect(() => {
    const fetchSavedRoute = async () => {
      try {
        if (!selectedLine?.id) {
          return;
        }

        const route = await findSavedRoute({
          lineId: selectedLine.id,
          trainTypeId: trainType?.groupId ?? null,
          destinationStationId: wantedDestination?.groupId ?? null,
        });
        setSavedRoute(route ?? null);
      } finally {
        setSavedRouteLoaded(true);
      }
    };
    fetchSavedRoute();
  }, [
    findSavedRoute,
    selectedLine?.id,
    trainType?.groupId,
    wantedDestination?.groupId,
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
    navigation.dispatch(StackActions.replace('SelectLine'));
  }, [navigation, setNavigationState, setStationState]);

  const handleBoundSelected = useCallback(
    (selectedStation: Station, direction: LineDirection): void => {
      const oedoLineTerminus =
        direction === 'INBOUND' ? stations[stations.length - 1] : stations[0];

      setStationState((prev) => ({
        ...prev,
        selectedBound:
          selectedLine?.id === TOEI_OEDO_LINE_ID
            ? oedoLineTerminus
            : selectedStation,
        selectedDirection: direction,
      }));
      navigation.navigate('Main' as never);
    },
    [navigation, selectedLine, setStationState, stations]
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
      navigation.navigate('Main' as never);
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
      const directionName = directionToDirectionName(selectedLine, direction);

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
    [inboundStations, outboundStations, selectedLine]
  );

  const renderButton = useCallback(
    ({ boundStations, direction }: RenderButtonProps) => {
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
              style={styles.button}
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

      const boundSelectOnPress = (): void =>
        handleBoundSelected(boundStations[0], direction);
      return (
        <Button
          style={styles.button}
          key={boundStations[0]?.id}
          onPress={boundSelectOnPress}
        >
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

    if (!selectedLine) {
      return;
    }

    const lineName = isJapanese
      ? selectedLine.nameShort
      : (selectedLine.nameRoman ?? selectedLine.nameShort);
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
        lineId: selectedLine.id,
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
      lineId: selectedLine.id,
      trainTypeId: null,
      destinationStationId: wantedDestination?.groupId ?? null,
      createdAt: new Date(),
    };

    setSavedRoute(await saveCurrentRoute(newRoute));
  }, [
    savedRoute,
    removeCurrentRoute,
    saveCurrentRoute,
    wantedDestination,
    selectedLine,
    trainType,
    stations,
  ]);

  if (error) {
    return (
      <ErrorScreen
        showStatus
        title={translate('errorTitle')}
        text={translate('apiErrorText')}
        onRetryPress={refetchStations}
        isFetching={loading}
      />
    );
  }

  if (!stations.length || loading) {
    return (
      <ScrollView contentContainerStyle={styles.bottom}>
        <View style={styles.container}>
          <Heading>{translate('selectBoundTitle')}</Heading>
          <ActivityIndicator style={styles.boundLoading} size="large" />
          <View style={styles.buttons}>
            <Button onPress={handleSelectBoundBackButtonPress}>
              {translate('back')}
            </Button>
          </View>

          <Typography style={styles.menuNotice}>
            {translate('menuNotice')}
          </Typography>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.bottom}>
      <View style={styles.container}>
        <Heading>{translate('selectBoundTitle')}</Heading>

        <View style={styles.horizontalButtons}>
          {renderButton({
            boundStations: inboundStations,
            direction: 'INBOUND',
          })}
          {renderButton({
            boundStations: outboundStations,
            direction: 'OUTBOUND',
          })}
        </View>

        <Button onPress={handleSelectBoundBackButtonPress}>
          {translate('back')}
        </Button>
        <Typography style={styles.menuNotice}>
          {translate('menuNotice')}
        </Typography>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 16,
            marginTop: 12,
            justifyContent: 'center',
          }}
        >
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
            {translate('autoModeSettings')}: {autoModeEnabled ? 'ON' : 'OFF'}
          </Button>
          {isDevApp && savedRouteLoaded && (
            <Button onPress={handleSaveRoutePress}>
              {translate(
                savedRoute ? 'removeFromSavedRoutes' : 'saveCurrentRoute'
              )}
            </Button>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

export default React.memo(SelectBoundScreen);
