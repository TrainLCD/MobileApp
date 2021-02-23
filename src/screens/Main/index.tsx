import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Dimensions,
  Platform,
  StyleSheet,
  View,
  Alert,
  Linking,
  BackHandler,
} from 'react-native';
import { TouchableWithoutFeedback } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useKeepAwake } from 'expo-keep-awake';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { LocationObject } from 'expo-location';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { useNavigation } from '@react-navigation/native';
import HMSLocation from '@hmscore/react-native-hms-location';
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
import gmsAvailability from '../../native/gmsAvailability';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
let globalSetBGLocation = (location: LocationObject): void => undefined;

gmsAvailability.isGMSAvailable().then((available) => {
  const isLocationTaskDefined = TaskManager.isTaskDefined(LOCATION_TASK_NAME);
  if (!isLocationTaskDefined && available) {
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
});

const { height: windowHeight } = Dimensions.get('window');

const styles = StyleSheet.create({
  touchable: {
    height: windowHeight - 128,
  },
});

const MainScreen: React.FC = () => {
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
  const navigation = useNavigation();

  const locationAccuracy = useMemo(() => {
    switch (selectedLine.lineType) {
      case LineType.Normal:
      case LineType.BulletTrain:
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
    const f = async (): Promise<void> => {
      if (await gmsAvailability.isGMSAvailable()) {
        Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: locationAccuracy,
          activityType: Location.ActivityType.Other,
          foregroundService: {
            notificationTitle: '最寄り駅更新中',
            notificationBody: 'バックグラウンドで最寄り駅を更新しています。',
          },
        });
      } else {
        HMSLocation.FusedLocation.Events.registerFusedLocationHeadlessTask(
          (data) => {
            console.log('registerFusedLocationHeadlessTask', data.lastLocation);
            setLocation((prev) => ({
              ...prev,
              location: data.lastLocation,
            }));
          }
        );
      }
    };
    f();

    return (): void => {
      const isLocationTaskDefined = TaskManager.isTaskDefined(
        LOCATION_TASK_NAME
      );
      if (!isLocationTaskDefined) {
        return;
      }
      Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    };
  }, [locationAccuracy, setLocation]);

  useEffect(() => {
    // GMSでのみ入ってくる
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

  const transferLines = useMemo(
    () =>
      arrived
        ? getCurrentStationLinesWithoutCurrentLine(leftStations, selectedLine)
        : getNextStationLinesWithoutCurrentLine(leftStations, selectedLine),
    [arrived, leftStations, selectedLine]
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
    navigation.navigate('SelectBound');
  }, [navigation, setNavigation, setStation]);
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
      );
    case 'TRANSFER':
      return (
        <View style={styles.touchable}>
          <Transfers onPress={toLineState} lines={transferLines} />
        </View>
      );
    default:
      return <></>;
  }
};

export default React.memo(MainScreen);
