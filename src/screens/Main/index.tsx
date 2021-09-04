import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Dimensions,
  Platform,
  StyleSheet,
  View,
  Alert,
  Linking,
  BackHandler,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useKeepAwake } from 'expo-keep-awake';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { LocationObject } from 'expo-location';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { useNavigation } from '@react-navigation/native';
import * as geolib from 'geolib';
import useTransitionHeaderState from '../../hooks/useTransitionHeaderState';
import useUpdateBottomState from '../../hooks/useUpdateBottomState';
import useRefreshStation from '../../hooks/useRefreshStation';
import useRefreshLeftStations from '../../hooks/useRefreshLeftStations';
import useWatchApproaching from '../../hooks/useWatchApproaching';
import LineBoard from '../../components/LineBoard';
import Transfers from '../../components/Transfers';
import {
  LOCATION_TASK_NAME,
  RUNNING_DURATION,
  WHOLE_DURATION,
} from '../../constants';
import { isJapanese, translate } from '../../translation';
import lineState from '../../store/atoms/line';
import stationState from '../../store/atoms/station';
import navigationState from '../../store/atoms/navigation';
import locationState from '../../store/atoms/location';
import { isYamanoteLine } from '../../utils/loopLine';
import speechState from '../../store/atoms/speech';
import useValueRef from '../../hooks/useValueRef';
import themeState from '../../store/atoms/theme';
import AppTheme from '../../models/Theme';
import TransfersYamanote from '../../components/TransfersYamanote';
import useTransferLines from '../../hooks/useTransferLines';
import TypeChangeNotify from '../../components/TypeChangeNotify';
import useNextTrainTypeIsDifferent from '../../hooks/useNextTrainTypeIsDifferent';

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
  const [{ stations, selectedDirection, station }, setStation] =
    useRecoilState(stationState);
  const [{ leftStations, bottomState, trainType }, setNavigation] =
    useRecoilState(navigationState);
  const setSpeech = useSetRecoilState(speechState);

  const hasTerminus = useMemo((): boolean => {
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
  }, [leftStations, selectedDirection, selectedLine.id, stations, trainType]);
  const setLocation = useSetRecoilState(locationState);
  const { autoMode } = useRecoilValue(navigationState);
  const [bgLocation, setBGLocation] = useState<LocationObject>();
  const [autoModeInboundIndex, setAutoModeInboundIndex] = useState(
    stations.findIndex((s) => s.groupId === station.groupId)
  );
  const [autoModeOutboundIndex, setAutoModeOutboundIndex] = useState(
    stations.findIndex((s) => s.groupId === station.groupId)
  );
  const autoModeInboundIndexRef = useValueRef(autoModeInboundIndex);
  const autoModeOutboundIndexRef = useValueRef(autoModeOutboundIndex);
  const selectedDirectionRef = useValueRef(selectedDirection);
  const [autoModeApproachingTimer, setAutoModeApproachingTimer] =
    useState<NodeJS.Timer>();
  const [autoModeArriveTimer, setAutoModeArriveTimer] =
    useState<NodeJS.Timer>();
  if (!autoMode) {
    globalSetBGLocation = setBGLocation;
  }
  const navigation = useNavigation();

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
          '@TrainLCD:dozeConfirmed'
        );
        if (firstOpenPassed === null) {
          Alert.alert(translate('notice'), translate('dozeAlertText'), [
            {
              text: translate('dontShowAgain'),
              style: 'cancel',
              onPress: async (): Promise<void> => {
                await AsyncStorage.setItem('@TrainLCD:dozeConfirmed', 'true');
              },
            },
            {
              text: translate('settings'),
              onPress: async (): Promise<void> => {
                Linking.openSettings().catch(() => {
                  openFailedToOpenSettingsAlert();
                });
                await AsyncStorage.setItem('@TrainLCD:dozeConfirmed', 'true');
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
    Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.High,
      activityType: Location.ActivityType.Other,
      foregroundService: {
        notificationTitle: translate('bgAlertTitle'),
        notificationBody: translate('bgAlertContent'),
      },
    });

    return (): void => {
      Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    };
  }, []);

  useEffect(() => {
    if (autoMode) {
      Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
  }, [autoMode]);

  const startApproachingTimer = useCallback(() => {
    if (!autoMode || autoModeApproachingTimer || !selectedDirection) {
      return;
    }

    const intervalInternal = () => {
      const direction = selectedDirectionRef.current;

      if (direction === 'INBOUND') {
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
        const next = stations[index + 1];

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
      } else if (direction === 'OUTBOUND') {
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
        const next = stations[index - 1];

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
    selectedDirectionRef,
    setLocation,
    stations,
  ]);

  useEffect(() => {
    startApproachingTimer();
  }, [startApproachingTimer]);

  const startArriveTimer = useCallback(() => {
    if (!autoMode || autoModeArriveTimer || !selectedDirection) {
      return;
    }

    const intervalInternal = () => {
      const direction = selectedDirectionRef.current;

      if (direction === 'INBOUND') {
        const index = autoModeInboundIndexRef.current;

        const next = stations[index];

        if (index === stations.length - 1) {
          setAutoModeInboundIndex(0);
        } else {
          setAutoModeInboundIndex((prev) => prev + 1);
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

        if (!index) {
          setAutoModeOutboundIndex(stations.length);
        } else {
          setAutoModeOutboundIndex((prev) => prev - 1);
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
    selectedDirectionRef,
    setLocation,
    stations,
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

  const toTypeChangeState = useCallback(() => {
    if (!nextTrainTypeIsDifferent) {
      return;
    }
    setNavigation((prev) => ({
      ...prev,
      bottomState: 'TYPE_CHANGE',
    }));
  }, [nextTrainTypeIsDifferent, setNavigation]);

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
    setSpeech((prev) => ({
      ...prev,
      muted: true,
    }));
    navigation.navigate('SelectBound');
  }, [navigation, setNavigation, setSpeech, setStation]);
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBackButtonPress();
      return true;
    });
    return (): void => {
      handler.remove();
    };
  }, [handleBackButtonPress, navigation]);

  switch (bottomState) {
    case 'LINE':
      return (
        <View style={{ flex: 1, height: windowHeight }}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={transferLines.length ? toTransferState : toTypeChangeState}
            style={styles.touchable}
          >
            <LineBoard hasTerminus={hasTerminus} />
          </TouchableOpacity>
        </View>
      );
    case 'TRANSFER':
      return (
        <View style={styles.touchable}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={nextTrainTypeIsDifferent ? toTypeChangeState : toLineState}
            style={styles.touchable}
          >
            {theme !== AppTheme.Yamanote ? (
              <Transfers theme={theme} lines={transferLines} />
            ) : (
              <TransfersYamanote lines={transferLines} />
            )}
          </TouchableOpacity>
        </View>
      );
    case 'TYPE_CHANGE':
      return (
        <View style={styles.touchable}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={toLineState}
            style={styles.touchable}
          >
            <TypeChangeNotify />
          </TouchableOpacity>
        </View>
      );
    default:
      return <></>;
  }
};

export default MainScreen;
