import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useKeepAwake } from 'expo-keep-awake';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { LocationObject } from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import TypeChangeNotify from '../components/TypeChangeNotify';
import { LOCATION_TASK_NAME } from '../constants';
import AsyncStorageKeys from '../constants/asyncStorageKeys';
import useAutoMode from '../hooks/useAutoMode';
import useNextTrainTypeIsDifferent from '../hooks/useNextTrainTypeIsDifferent';
import useRefreshLeftStations from '../hooks/useRefreshLeftStations';
import useRefreshStation from '../hooks/useRefreshStation';
import useResetMainState from '../hooks/useResetMainState';
import useShouldHideTypeChange from '../hooks/useShouldHideTypeChange';
import useTransferLines from '../hooks/useTransferLines';
import useTransitionHeaderState from '../hooks/useTransitionHeaderState';
import useUpdateBottomState from '../hooks/useUpdateBottomState';
import useWatchApproaching from '../hooks/useWatchApproaching';
import { StopCondition } from '../models/StationAPI';
import lineState from '../store/atoms/line';
import locationState from '../store/atoms/location';
import mirroringShareState from '../store/atoms/mirroringShare';
import navigationState from '../store/atoms/navigation';
import speechState from '../store/atoms/speech';
import stationState from '../store/atoms/station';
import themeState from '../store/atoms/theme';
import { translate } from '../translation';
import getCurrentStationIndex from '../utils/currentStationIndex';
import isHoliday from '../utils/isHoliday';
import { isYamanoteLine } from '../utils/loopLine';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
let globalSetBGLocation = (location: LocationObject): void => undefined;

const isLocationTaskDefined = TaskManager.isTaskDefined(LOCATION_TASK_NAME);
if (!isLocationTaskDefined) {
  TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }): void => {
    if (error) {
      return;
    }
    const { locations } = data as { locations: LocationObject[] };
    if (locations[0]) {
      globalSetBGLocation(locations[0]);
    }
  });
}

const { height: windowHeight } = Dimensions.get('window');

const styles = StyleSheet.create({
  touchable: {
    height: windowHeight - 128,
  },
});

const MainScreen: React.FC = () => {
  const { theme } = useRecoilValue(themeState);
  const { selectedLine } = useRecoilValue(lineState);
  const { stations, selectedDirection, station } = useRecoilValue(stationState);
  const [
    { leftStations, bottomState, trainType, autoModeEnabled },
    setNavigation,
  ] = useRecoilState(navigationState);
  const setSpeech = useSetRecoilState(speechState);
  const { subscribing } = useRecoilValue(mirroringShareState);

  useAutoMode(autoModeEnabled);

  const hasTerminus = useMemo((): boolean => {
    if (!selectedLine) {
      return false;
    }
    if (
      isYamanoteLine(selectedLine.id) ||
      (!trainType && selectedLine.id === 11623)
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
  }, [leftStations, selectedDirection, selectedLine, stations, trainType]);
  const setLocation = useSetRecoilState(locationState);
  const [bgLocation, setBGLocation] = useState<LocationObject>();
  const [partiallyAlertShown, setPartiallyAlertShown] = useState(false);

  if (!autoModeEnabled && !subscribing) {
    globalSetBGLocation = setBGLocation;
  }
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

  useFocusEffect(
    useCallback(() => {
      if (!subscribing && !autoModeEnabled)
        Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.BestForNavigation,
          deferredUpdatesInterval: 1000,
          foregroundService: {
            notificationTitle: translate('bgAlertTitle'),
            notificationBody: translate('bgAlertContent'),
          },
        });

      return () => {
        Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      };
    }, [autoModeEnabled, subscribing])
  );

  useEffect(() => {
    if (bgLocation) {
      setLocation((prev) => ({
        ...prev,
        location: bgLocation,
      }));
    }
  }, [bgLocation, setLocation]);

  useTransitionHeaderState();
  useRefreshLeftStations(selectedLine, selectedDirection);
  useRefreshStation();
  const [refreshBottomStateFunc] = useUpdateBottomState();
  useWatchApproaching();
  useKeepAwake();
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

  useEffect(() => {
    refreshBottomStateFunc();
  }, [refreshBottomStateFunc]);

  const transferLines = useTransferLines();

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

  const nextTrainTypeIsDifferent = useNextTrainTypeIsDifferent();
  const shouldHideTypeChange = useShouldHideTypeChange();

  const toTypeChangeState = useCallback(() => {
    if (!nextTrainTypeIsDifferent || shouldHideTypeChange) {
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
  }, [nextTrainTypeIsDifferent, setNavigation, shouldHideTypeChange]);

  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBackButtonPress();
      return true;
    });
    return (): void => {
      handler.remove();
    };
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
      return (
        <View style={styles.touchable}>
          <Transfers
            theme={theme}
            onPress={nextTrainTypeIsDifferent ? toTypeChangeState : toLineState}
            lines={transferLines}
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
