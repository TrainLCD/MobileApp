import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ActionSheetIOS,
  Dimensions,
  Platform,
  StyleSheet,
  View,
  BackHandler,
} from 'react-native';
import {
  State,
  LongPressGestureHandler,
  TouchableWithoutFeedback,
} from 'react-native-gesture-handler';
import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LocationObject } from 'expo-location';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import {
  getCurrentStationLinesWithoutCurrentLine,
  getNextStationLinesWithoutCurrentLine,
} from '../../utils/line';
import useTransitionHeaderState from '../../hooks/useTransitionHeaderState';
import useUpdateBottomState from '../../hooks/useUpdateBottomState';
import useRefreshStation from '../../hooks/useRefreshStation';
import useRefreshLeftStations from '../../hooks/useRefreshLeftStations';
import useWatchApproaching from '../../hooks/useWatchApproaching';
import LineBoard from '../../components/LineBoard';
import Transfers from '../../components/Transfers';
import { LOCATION_TASK_NAME } from '../../constants';
import { isJapanese, translate } from '../../translation';
import lineState from '../../store/atoms/line';
import stationState from '../../store/atoms/station';
import navigationState from '../../store/atoms/navigation';
import locationState from '../../store/atoms/location';
import { isOsakaLoopLine, isYamanoteLine } from '../../utils/loopLine';
import { LineType } from '../../models/StationAPI';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
let globalSetBGLocation = (location: LocationObject): void => undefined;

const isLocationTaskDefined = TaskManager.isTaskDefined(LOCATION_TASK_NAME);
if (!isLocationTaskDefined) {
  TaskManager.defineTask(
    LOCATION_TASK_NAME,
    ({ data, error }): BackgroundFetch.Result => {
      if (error) {
        return BackgroundFetch.Result.Failed;
      }
      const { locations } = data as { locations: LocationObject[] };
      if (locations[0]) {
        globalSetBGLocation(locations[0]);
        return BackgroundFetch.Result.NewData;
      }
      return BackgroundFetch.Result.NoData;
    }
  );
}

const { height: windowHeight } = Dimensions.get('window');

const styles = StyleSheet.create({
  touchable: {
    height: windowHeight - 128,
  },
});

const MainScreen: React.FC = () => {
  const navigation = useNavigation();
  const { selectedLine } = useRecoilValue(lineState);
  const [{ stations, selectedDirection, arrived }, setStation] = useRecoilState(
    stationState
  );
  const [{ leftStations, bottomState }, setNavigation] = useRecoilState(
    navigationState
  );
  const hasTerminus = useMemo((): boolean => {
    if (isYamanoteLine(selectedLine.id) || isOsakaLoopLine(selectedLine.id)) {
      return false;
    }
    if (selectedDirection === 'INBOUND') {
      return !!leftStations.find(
        (ls) => ls.id === stations[stations.length - 1].id
      );
    }

    return !!leftStations.find(
      (ls) => ls.id === stations.slice().reverse()[stations.length - 1].id
    );
  }, [leftStations, selectedDirection, selectedLine.id, stations]);
  const setLocation = useSetRecoilState(locationState);
  const [bgLocation, setBGLocation] = useState<LocationObject>();
  globalSetBGLocation = setBGLocation;

  const locationAccuracy = useMemo(() => {
    switch (selectedLine.lineType) {
      case LineType.Normal:
      case LineType.BulletTrain:
        return Location.Accuracy.Balanced;
      case LineType.Monorail:
      case LineType.Tram:
      case LineType.AGT:
      case LineType.Other:
        return Location.Accuracy.High;
      case LineType.Subway:
        return Location.Accuracy.BestForNavigation;
      default:
        return Location.Accuracy.Balanced;
    }
  }, [selectedLine.lineType]);

  useFocusEffect(
    useCallback(() => {
      Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: locationAccuracy,
        activityType: Location.ActivityType.OtherNavigation,
        foregroundService: {
          notificationTitle: '最寄り駅更新中',
          notificationBody: 'バックグラウンドで最寄り駅を更新しています。',
        },
      });

      return (): void => {
        Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      };
    }, [locationAccuracy])
  );

  useEffect(() => {
    if (bgLocation) {
      setLocation((prev) => ({
        ...prev,
        location: bgLocation,
      }));
    }
  }, [bgLocation, setLocation]);

  const handleBackButtonPress = useCallback(() => {
    setNavigation((prev) => ({
      ...prev,
      headerState: isJapanese ? 'CURRENT' : 'CURRENT_EN',
      bottomState: 'LINE',
    }));
    setStation((prev) => ({
      ...prev,
      selectedDirection: null,
      selectedBound: null,
    }));
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation, setNavigation, setStation]);

  useTransitionHeaderState();
  useRefreshLeftStations(selectedLine, selectedDirection);
  useRefreshStation();
  const [refreshBottomStateFunc] = useUpdateBottomState();
  useWatchApproaching();

  useKeepAwake();

  const handler = useMemo(
    () =>
      BackHandler.addEventListener('hardwareBackPress', () => {
        handleBackButtonPress();
        return true;
      }),
    [handleBackButtonPress]
  );

  useEffect(() => {
    refreshBottomStateFunc();

    return (): void => {
      if (handler) {
        handler.remove();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const transferLines = useMemo(
    () =>
      arrived
        ? getCurrentStationLinesWithoutCurrentLine(leftStations, selectedLine)
        : getNextStationLinesWithoutCurrentLine(leftStations, selectedLine),
    [arrived, leftStations, selectedLine]
  );

  const onLongPress = useCallback(
    ({ nativeEvent }): void => {
      if (nativeEvent.state === State.ACTIVE) {
        if (Platform.OS !== 'ios') {
          return;
        }
        Haptics.selectionAsync();
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: [translate('back'), translate('cancel')],
            destructiveButtonIndex: 0,
            cancelButtonIndex: 1,
          },
          (buttonIndex) => {
            if (!buttonIndex) {
              handleBackButtonPress();
            }
          }
        );
      }
    },
    [handleBackButtonPress]
  );

  const toTransferState = useCallback((): void => {
    if (transferLines.length) {
      setNavigation((prev) => ({
        ...prev,
        bottomState: 'TRANSFER',
      }));
    }
  }, [setNavigation, transferLines.length]);

  const toLineState = useCallback((): void => {
    setNavigation((prev) => ({
      ...prev,
      bottomState: 'LINE',
    }));
  }, [setNavigation]);

  switch (bottomState) {
    case 'LINE':
      return (
        <LongPressGestureHandler
          onHandlerStateChange={onLongPress}
          minDurationMs={800}
        >
          <View style={{ flex: 1, height: windowHeight }}>
            <TouchableWithoutFeedback
              onPress={toTransferState}
              style={styles.touchable}
            >
              <LineBoard
                arrived={arrived}
                line={selectedLine}
                stations={leftStations}
                hasTerminus={hasTerminus}
              />
            </TouchableWithoutFeedback>
          </View>
        </LongPressGestureHandler>
      );
    case 'TRANSFER':
      return (
        <LongPressGestureHandler
          onHandlerStateChange={onLongPress}
          minDurationMs={800}
        >
          <View style={styles.touchable}>
            <Transfers onPress={toLineState} lines={transferLines} />
          </View>
        </LongPressGestureHandler>
      );
    default:
      return <></>;
  }
};

export default React.memo(MainScreen);
