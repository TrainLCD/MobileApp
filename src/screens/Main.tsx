import AsyncStorage from '@react-native-async-storage/async-storage';
import { useKeepAwake } from 'expo-keep-awake';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { LocationObject } from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import React, {
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Alert,
  BackHandler,
  Dimensions,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { TouchableWithoutFeedback } from 'react-native-gesture-handler';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import LineBoard from '../components/LineBoard';
import Transfers from '../components/Transfers';
import TransfersYamanote from '../components/TransfersYamanote';
import TypeChangeNotify from '../components/TypeChangeNotify';
import AsyncStorageKeys from '../constants/asyncStorageKeys';
import { LOCATION_TASK_NAME } from '../constants/location';
import useAutoMode from '../hooks/useAutoMode';
import useCurrentLine from '../hooks/useCurrentLine';
import useNextStation from '../hooks/useNextStation';
import useNextTrainTypeIsDifferent from '../hooks/useNextTrainTypeIsDifferent';
import useRecordRoute from '../hooks/useRecordRoute';
import useRefreshLeftStations from '../hooks/useRefreshLeftStations';
import useRefreshStation from '../hooks/useRefreshStation';
import useResetMainState from '../hooks/useResetMainState';
import useShouldHideTypeChange from '../hooks/useShouldHideTypeChange';
import useTransferLines from '../hooks/useTransferLines';
import useTransitionHeaderState from '../hooks/useTransitionHeaderState';
import useTTSProvider from '../hooks/useTTSProvider';
import useUpdateBottomState from '../hooks/useUpdateBottomState';
import useWatchApproaching from '../hooks/useWatchApproaching';
import { StopCondition } from '../models/StationAPI';
import AppTheme from '../models/Theme';
import locationState from '../store/atoms/location';
import mirroringShareState from '../store/atoms/mirroringShare';
import navigationState from '../store/atoms/navigation';
import speechState from '../store/atoms/speech';
import stationState from '../store/atoms/station';
import themeState from '../store/atoms/theme';
import tuningState from '../store/atoms/tuning';
import { translate } from '../translation';
import getCurrentStationIndex from '../utils/currentStationIndex';
import isHoliday from '../utils/isHoliday';
import getIsPass from '../utils/isPass';
import {
  isMeijoLine,
  isOsakaLoopLine,
  isYamanoteLine,
} from '../utils/loopLine';

let globalSetBGLocation = (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  value: SetStateAction<LocationObject | undefined>
): void => undefined;

TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }): void => {
  if (error) {
    return;
  }
  const { locations } = data as { locations: LocationObject[] };
  if (locations[0]) {
    globalSetBGLocation((prev) => {
      // パフォーマンス対策 同じ座標が入ってきたときはオブジェクトを更新しない
      // こうすると停車中一切データが入ってこないとき（シミュレーターでよくある）
      // アプリが固まることはなくなるはず
      const isSame =
        locations[0].coords.latitude === prev?.coords.latitude &&
        locations[0].coords.longitude === prev?.coords.longitude;
      if (isSame) {
        return prev;
      }
      return locations[0];
    });
  }
});

const { height: windowHeight } = Dimensions.get('window');

const styles = StyleSheet.create({
  touchable: {
    height: windowHeight - 128,
  },
});

const MainScreen: React.FC = () => {
  const { theme } = useRecoilValue(themeState);
  const { stations, selectedDirection, station, arrived } =
    useRecoilValue(stationState);
  const [
    { leftStations, bottomState, trainType, autoModeEnabled },
    setNavigation,
  ] = useRecoilState(navigationState);
  const setSpeech = useSetRecoilState(speechState);
  const { subscribing } = useRecoilValue(mirroringShareState);
  const { locationAccuracy } = useRecoilValue(tuningState);

  const currentLine = useCurrentLine();
  const nextStation = useNextStation();
  useAutoMode(autoModeEnabled);

  const hasTerminus = useMemo((): boolean => {
    if (!currentLine) {
      return false;
    }
    if (
      isYamanoteLine(currentLine.id) ||
      (!trainType && isOsakaLoopLine(currentLine.id)) ||
      isMeijoLine(currentLine.id)
    ) {
      return false;
    }
    if (selectedDirection === 'INBOUND') {
      return !!leftStations
        .slice(0, 8)
        .find((ls) => ls.id === stations[stations.length - 1]?.id);
    }

    return !!leftStations
      .slice(0, 8)
      .find(
        (ls) => ls.id === stations.slice().reverse()[stations.length - 1]?.id
      );
  }, [leftStations, selectedDirection, currentLine, stations, trainType]);
  const setLocation = useSetRecoilState(locationState);
  const [bgLocation, setBGLocation] = useState<LocationObject>();
  if (!autoModeEnabled && !subscribing) {
    globalSetBGLocation = setBGLocation;
  }
  const [partiallyAlertShown, setPartiallyAlertShown] = useState(false);

  const openFailedToOpenSettingsAlert = useCallback(
    () =>
      Alert.alert(translate('errorTitle'), translate('failedToOpenSettings'), [
        {
          text: 'OK',
        },
      ]),
    []
  );

  useEffect(() => {
    setSpeech((prev) => ({
      ...prev,
      muted: false,
    }));
  }, [setSpeech]);

  useEffect(() => {
    if (Platform.OS === 'android') {
      const f = async (): Promise<void> => {
        const firstOpenPassed = await AsyncStorage.getItem(
          AsyncStorageKeys.DozeConfirmed
        );
        if (firstOpenPassed === null) {
          Alert.alert(translate('notice'), translate('dozeAlertText'), [
            {
              text: translate('dontShowAgain'),
              style: 'cancel',
              onPress: async (): Promise<void> => {
                await AsyncStorage.setItem(
                  AsyncStorageKeys.DozeConfirmed,
                  'true'
                );
              },
            },
            {
              text: translate('settings'),
              onPress: async (): Promise<void> => {
                Linking.openSettings().catch(() => {
                  openFailedToOpenSettingsAlert();
                });
                await AsyncStorage.setItem(
                  AsyncStorageKeys.DozeConfirmed,
                  'true'
                );
              },
            },
            {
              text: 'OK',
              style: 'cancel',
            },
          ]);
        }
      };
      f();
    }
  }, [openFailedToOpenSettingsAlert]);

  useEffect((): (() => void) => {
    const startUpdateLocationAsync = async () => {
      if (!TaskManager.isTaskDefined(LOCATION_TASK_NAME)) {
        return;
      }
      const isStarted = await Location.hasStartedLocationUpdatesAsync(
        LOCATION_TASK_NAME
      );
      if (!isStarted && !autoModeEnabled && !subscribing) {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: locationAccuracy,
          foregroundService: {
            notificationTitle: translate('bgAlertTitle'),
            notificationBody: translate('bgAlertContent'),
            killServiceOnDestroy: true,
          },
        });
      }
    };

    startUpdateLocationAsync();

    return () => Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }, [autoModeEnabled, locationAccuracy, subscribing]);

  useEffect(() => {
    if (bgLocation) {
      setLocation((prev) => ({
        ...prev,
        location: bgLocation as Location.LocationObject,
      }));
    }
  }, [bgLocation, setLocation]);

  useTransitionHeaderState();
  useRefreshLeftStations(currentLine, selectedDirection);
  useRefreshStation();
  const { pause: pauseBottomTimer } = useUpdateBottomState();
  useWatchApproaching();
  useKeepAwake();
  useTTSProvider();
  useRecordRoute();
  const handleBackButtonPress = useResetMainState();

  useEffect(() => {
    if (selectedDirection && !partiallyAlertShown) {
      const currentStationIndex = getCurrentStationIndex(stations, station);
      const stationsFromCurrentStation =
        selectedDirection === 'INBOUND'
          ? stations.slice(currentStationIndex)
          : stations.slice(0, currentStationIndex + 1);

      if (
        stationsFromCurrentStation.findIndex(
          (s) => s.stopCondition === StopCondition.WEEKDAY
        ) !== -1 &&
        isHoliday
      ) {
        Alert.alert(translate('notice'), translate('holidayNotice'));
        setPartiallyAlertShown(true);
      }
      if (
        stationsFromCurrentStation.findIndex(
          (s) => s.stopCondition === StopCondition.HOLIDAY
        ) !== -1 &&
        !isHoliday
      ) {
        Alert.alert(translate('notice'), translate('weekdayNotice'));
        setPartiallyAlertShown(true);
      }

      if (
        stationsFromCurrentStation.findIndex(
          (s) => s.stopCondition === StopCondition.PARTIAL
        ) !== -1
      ) {
        Alert.alert(translate('notice'), translate('partiallyPassNotice'));
        setPartiallyAlertShown(true);
      }
    }
  }, [partiallyAlertShown, selectedDirection, station, stations]);

  const transferLines = useTransferLines();

  const toTransferState = useCallback((): void => {
    if (transferLines.length) {
      pauseBottomTimer();
      setNavigation((prev) => ({
        ...prev,
        bottomState: 'TRANSFER',
      }));
    }
  }, [pauseBottomTimer, setNavigation, transferLines.length]);

  const toLineState = useCallback((): void => {
    pauseBottomTimer();
    setNavigation((prev) => ({
      ...prev,
      bottomState: 'LINE',
    }));
  }, [pauseBottomTimer, setNavigation]);

  const nextTrainTypeIsDifferent = useNextTrainTypeIsDifferent();
  const shouldHideTypeChange = useShouldHideTypeChange();

  const toTypeChangeState = useCallback(() => {
    if (!nextTrainTypeIsDifferent || shouldHideTypeChange) {
      pauseBottomTimer();
      setNavigation((prev) => ({
        ...prev,
        bottomState: 'LINE',
      }));
      return;
    }
    setNavigation((prev) => ({
      ...prev,
      bottomState: 'TYPE_CHANGE',
    }));
  }, [
    nextTrainTypeIsDifferent,
    pauseBottomTimer,
    setNavigation,
    shouldHideTypeChange,
  ]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        handleBackButtonPress();
        return true;
      }
    );
    return subscription.remove;
  }, [handleBackButtonPress]);

  switch (bottomState) {
    case 'LINE':
      return (
        <View style={{ flex: 1, height: windowHeight }}>
          <TouchableWithoutFeedback
            style={styles.touchable}
            onPress={transferLines.length ? toTransferState : toTypeChangeState}
          >
            <LineBoard hasTerminus={hasTerminus} />
          </TouchableWithoutFeedback>
        </View>
      );
    case 'TRANSFER':
      if (!station) {
        return null;
      }
      if (theme === AppTheme.Yamanote) {
        return (
          <TransfersYamanote
            onPress={nextTrainTypeIsDifferent ? toTypeChangeState : toLineState}
            lines={transferLines}
          />
        );
      }
      return (
        <View style={styles.touchable}>
          <Transfers
            theme={theme}
            onPress={nextTrainTypeIsDifferent ? toTypeChangeState : toLineState}
            lines={transferLines}
            station={arrived && !getIsPass(station) ? station : nextStation}
          />
        </View>
      );
    case 'TYPE_CHANGE':
      return (
        <View style={styles.touchable}>
          <TouchableWithoutFeedback
            onPress={toLineState}
            style={styles.touchable}
          >
            <TypeChangeNotify />
          </TouchableWithoutFeedback>
        </View>
      );
    default:
      return <></>;
  }
};

export default React.memo(MainScreen);
