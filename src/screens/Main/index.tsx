import AsyncStorage from '@react-native-async-storage/async-storage';
import { useKeepAwake } from 'expo-keep-awake';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { LocationObject } from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as geolib from 'geolib';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Dimensions, Platform, StyleSheet, View } from 'react-native';
import { TouchableWithoutFeedback } from 'react-native-gesture-handler';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import LineBoard from '../../components/LineBoard';
import Transfers from '../../components/Transfers';
import TransfersYamanote from '../../components/TransfersYamanote';
import TypeChangeNotify from '../../components/TypeChangeNotify';
import {
  LOCATION_TASK_NAME,
  RUNNING_DURATION,
  WHOLE_DURATION,
} from '../../constants';
import AsyncStorageKeys from '../../constants/asyncStorageKeys';
import useNextTrainTypeIsDifferent from '../../hooks/useNextTrainTypeIsDifferent';
import useRefreshLeftStations from '../../hooks/useRefreshLeftStations';
import useRefreshStation from '../../hooks/useRefreshStation';
import useShouldHideTypeChange from '../../hooks/useShouldHideTypeChange';
import useTransferLines from '../../hooks/useTransferLines';
import useTransitionHeaderState from '../../hooks/useTransitionHeaderState';
import useUpdateBottomState from '../../hooks/useUpdateBottomState';
import useValueRef from '../../hooks/useValueRef';
import useWatchApproaching from '../../hooks/useWatchApproaching';
import { StopCondition } from '../../models/StationAPI';
import AppTheme from '../../models/Theme';
import lineState from '../../store/atoms/line';
import locationState from '../../store/atoms/location';
import mirroringShareState from '../../store/atoms/mirroringShare';
import navigationState from '../../store/atoms/navigation';
import speechState from '../../store/atoms/speech';
import stationState from '../../store/atoms/station';
import themeState from '../../store/atoms/theme';
import { translate } from '../../translation';
import getCurrentStationIndex from '../../utils/currentStationIndex';
import isHoliday from '../../utils/isHoliday';
import { getIsLoopLine, isYamanoteLine } from '../../utils/loopLine';

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
  const [{ leftStations, bottomState, trainType }, setNavigation] =
    useRecoilState(navigationState);
  const setSpeech = useSetRecoilState(speechState);
  const { subscribing } = useRecoilValue(mirroringShareState);

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
  const { autoMode } = useRecoilValue(navigationState);
  const [bgLocation, setBGLocation] = useState<LocationObject>();
  const [autoModeInboundIndex, setAutoModeInboundIndex] = useState(
    stations.findIndex((s) => s.groupId === station?.groupId)
  );
  const [autoModeOutboundIndex, setAutoModeOutboundIndex] = useState(
    stations.findIndex((s) => s.groupId === station?.groupId)
  );
  const autoModeInboundIndexRef = useValueRef(autoModeInboundIndex);
  const autoModeOutboundIndexRef = useValueRef(autoModeOutboundIndex);
  const [autoModeApproachingTimer, setAutoModeApproachingTimer] =
    useState<NodeJS.Timer>();
  const [autoModeArriveTimer, setAutoModeArriveTimer] =
    useState<NodeJS.Timer>();
  const [partiallyAlertShown, setPartiallyAlertShown] = useState(false);

  if (!autoMode && !subscribing) {
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

  useEffect(() => {
    if (!subscribing && !autoMode)
      Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.High,
        activityType: Location.ActivityType.Other,
        foregroundService: {
          notificationTitle: translate('bgAlertTitle'),
          notificationBody: translate('bgAlertContent'),
        },
      });
  }, [autoMode, subscribing]);

  const startApproachingTimer = useCallback(() => {
    if (
      !autoMode ||
      autoModeApproachingTimer ||
      !selectedDirection ||
      !selectedLine
    ) {
      return;
    }

    const intervalInternal = () => {
      const isLoopLine = getIsLoopLine(selectedLine, trainType);

      if (selectedDirection === 'INBOUND') {
        const index = autoModeInboundIndexRef.current;

        if (!index) {
          setLocation((prev) => ({
            ...prev,
            location: {
              coords: {
                latitude: stations[0].latitude,
                longitude: stations[0].longitude,
                accuracy: 0,
              },
            },
          }));
          return;
        }

        const cur = stations[index];
        const next = isLoopLine ? stations[index - 1] : stations[index + 1];

        if (cur && next) {
          const center = geolib.getCenter([
            {
              latitude: cur.latitude,
              longitude: cur.longitude,
            },
            {
              latitude: next.latitude,
              longitude: next.longitude,
            },
          ]);

          if (center) {
            setLocation((prev) => ({
              ...prev,
              location: {
                coords: { ...center, accuracy: 0 },
              },
            }));
          }
        }
      } else {
        const index = autoModeOutboundIndexRef.current;

        if (index === stations.length - 1) {
          setLocation((prev) => ({
            ...prev,
            location: {
              coords: {
                latitude: stations[stations.length - 1].latitude,
                longitude: stations[stations.length - 1].longitude,
                accuracy: 0,
              },
            },
          }));
          return;
        }

        const cur = stations[index];
        const next = isLoopLine ? stations[index + 1] : stations[index - 1];

        if (cur && next) {
          const center = geolib.getCenter([
            {
              latitude: cur.latitude,
              longitude: cur.longitude,
            },
            {
              latitude: next.latitude,
              longitude: next.longitude,
            },
          ]);

          if (center) {
            setLocation((prev) => ({
              ...prev,
              location: {
                coords: { ...center, accuracy: 0 },
              },
            }));
          }
        }
      }
    };

    intervalInternal();

    const interval = setInterval(intervalInternal, RUNNING_DURATION);

    setAutoModeApproachingTimer(interval);
  }, [
    autoMode,
    autoModeApproachingTimer,
    autoModeInboundIndexRef,
    autoModeOutboundIndexRef,
    selectedDirection,
    selectedLine,
    setLocation,
    stations,
    trainType,
  ]);

  useEffect(() => {
    startApproachingTimer();
  }, [startApproachingTimer]);

  const startArriveTimer = useCallback(() => {
    const direction = selectedDirection;

    if (!autoMode || autoModeArriveTimer || !direction || !selectedLine) {
      return;
    }
    const isLoopLine = getIsLoopLine(selectedLine, trainType);

    const intervalInternal = () => {
      if (direction === 'INBOUND') {
        const index = autoModeInboundIndexRef.current;

        const next = stations[index];

        if (!isLoopLine && index === stations.length - 1) {
          setAutoModeInboundIndex(0);
        } else {
          setAutoModeInboundIndex((prev) => (isLoopLine ? prev - 1 : prev + 1));
        }

        if (!index && isLoopLine) {
          setAutoModeInboundIndex(stations.length - 1);
        }

        if (next) {
          setLocation((prev) => ({
            ...prev,
            location: {
              coords: {
                latitude: next.latitude,
                longitude: next.longitude,
                accuracy: 0,
              },
            },
          }));
        }
      } else if (direction === 'OUTBOUND') {
        const index = autoModeOutboundIndexRef.current;

        const next = stations[index];
        if (!isLoopLine && !index) {
          setAutoModeOutboundIndex(stations.length);
        } else {
          setAutoModeOutboundIndex((prev) =>
            isLoopLine ? prev + 1 : prev - 1
          );
        }

        if (index === stations.length - 1 && isLoopLine) {
          setAutoModeOutboundIndex(0);
        }

        if (next) {
          setLocation((prev) => ({
            ...prev,
            location: {
              coords: {
                latitude: next.latitude,
                longitude: next.longitude,
                accuracy: 0,
              },
            },
          }));
        }
      }
    };

    intervalInternal();

    const interval = setInterval(intervalInternal, WHOLE_DURATION);
    setAutoModeArriveTimer(interval);
  }, [
    autoMode,
    autoModeArriveTimer,
    autoModeInboundIndexRef,
    autoModeOutboundIndexRef,
    selectedDirection,
    selectedLine,
    setLocation,
    stations,
    trainType,
  ]);

  useEffect(() => {
    startArriveTimer();
  }, [startArriveTimer]);

  useEffect(() => {
    return () => {
      if (autoModeApproachingTimer) {
        clearInterval(autoModeApproachingTimer);
      }
      if (autoModeArriveTimer) {
        clearInterval(autoModeArriveTimer);
      }
    };
  }, [autoModeApproachingTimer, autoModeArriveTimer]);

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
          {theme !== AppTheme.Yamanote ? (
            <Transfers
              theme={theme}
              onPress={
                nextTrainTypeIsDifferent ? toTypeChangeState : toLineState
              }
              lines={transferLines}
            />
          ) : (
            <TransfersYamanote
              onPress={
                nextTrainTypeIsDifferent ? toTypeChangeState : toLineState
              }
              lines={transferLines}
            />
          )}
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
