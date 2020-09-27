import i18n from 'i18n-js';
import React, { useEffect, useState, useCallback, memo } from 'react';
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
import { useDispatch, useSelector } from 'react-redux';
import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { useNavigation } from '@react-navigation/native';
import { LocationObject } from 'expo-location';
import { TrainLCDAppState } from '../../store';
import {
  getCurrentStationLinesWithoutCurrentLine,
  getNextStationLinesWithoutCurrentLine,
} from '../../utils/line';
import getTranslatedText from '../../utils/translate';
import useTransitionHeaderState from '../../hooks/useTransitionHeaderState';
import useUpdateBottomState from '../../hooks/useUpdateBottomState';
import useRefreshStation from '../../hooks/useRefreshStation';
import useRefreshLeftStations from '../../hooks/useRefreshLeftStations';
import useWatchApproaching from '../../hooks/useWatchApproaching';
import LineBoard from '../../components/LineBoard';
import {
  updateBottomState,
  updateHeaderState,
} from '../../store/actions/navigation';
import {
  updateSelectedDirection,
  updateSelectedBound,
} from '../../store/actions/station';
import Transfers from '../../components/Transfers';
import { LOCATION_TASK_NAME } from '../../constants';
import { updateLocationSuccess } from '../../store/actions/location';

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
const MainScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { selectedLine } = useSelector((state: TrainLCDAppState) => state.line);
  const { selectedDirection, arrived } = useSelector(
    (state: TrainLCDAppState) => state.station
  );
  const { leftStations, bottomState } = useSelector(
    (state: TrainLCDAppState) => state.navigation
  );
  const [bgLocation, setBGLocation] = useState<LocationObject>();
  globalSetBGLocation = setBGLocation;

  useEffect(() => {
    Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.BestForNavigation,
      activityType: Location.ActivityType.AutomotiveNavigation,
      foregroundService: {
        notificationTitle: '最寄り駅更新中',
        notificationBody: 'バックグラウンドで最寄り駅を更新しています。',
      },
    });

    return (): void => {
      Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    };
  }, []);

  useEffect(() => {
    if (bgLocation) {
      dispatch(updateLocationSuccess(bgLocation));
    }
  }, [bgLocation, dispatch]);

  const handleBackButtonPress = useCallback(() => {
    dispatch(
      updateHeaderState(i18n.locale === 'ja' ? 'CURRENT' : 'CURRENT_EN')
    );
    dispatch(updateBottomState('LINE'));
    dispatch(updateSelectedDirection(null));
    dispatch(updateSelectedBound(null));
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [dispatch, navigation]);

  useTransitionHeaderState();
  useRefreshLeftStations(selectedLine, selectedDirection);
  useRefreshStation();
  const [refreshBottomStateFunc] = useUpdateBottomState();
  useWatchApproaching();

  useKeepAwake();

  const handler = BackHandler.addEventListener('hardwareBackPress', () => {
    handleBackButtonPress();
    return true;
  });

  useEffect(() => {
    refreshBottomStateFunc();

    return (): void => {
      if (handler) {
        handler.remove();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const transferLines = arrived
    ? getCurrentStationLinesWithoutCurrentLine(leftStations, selectedLine)
    : getNextStationLinesWithoutCurrentLine(leftStations, selectedLine);

  const onLongPress = ({ nativeEvent }): void => {
    if (nativeEvent.state === State.ACTIVE) {
      if (Platform.OS !== 'ios') {
        return;
      }
      Haptics.selectionAsync();
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [getTranslatedText('back'), getTranslatedText('cancel')],
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
  };

  const [windowHeight, setWindowHeight] = useState(
    Dimensions.get('window').height
  );

  const styles = StyleSheet.create({
    touchable: {
      height: windowHeight - 128,
    },
  });

  const onLayout = (): void => {
    setWindowHeight(Dimensions.get('window').height);
  };

  const toTransferState = (): void => {
    if (transferLines.length) {
      dispatch(updateBottomState('TRANSFER'));
    }
  };

  const toLineState = (): void => {
    dispatch(updateBottomState('LINE'));
  };

  switch (bottomState) {
    case 'LINE':
      return (
        <LongPressGestureHandler
          onHandlerStateChange={onLongPress}
          minDurationMs={800}
        >
          <View onLayout={onLayout} style={{ flex: 1, height: windowHeight }}>
            <TouchableWithoutFeedback
              onPress={toTransferState}
              style={styles.touchable}
            >
              <LineBoard
                arrived={arrived}
                line={selectedLine}
                stations={leftStations}
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
          <View onLayout={onLayout} style={styles.touchable}>
            <Transfers onPress={toLineState} lines={transferLines} />
          </View>
        </LongPressGestureHandler>
      );
    default:
      return <></>;
  }
};

export default memo(MainScreen);
