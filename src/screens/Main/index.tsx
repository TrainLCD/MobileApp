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
import { isYamanoteLine } from '../../utils/loopLine';
import getSlicedStations from '../../utils/slicedStations';
import getCurrentLine from '../../utils/currentLine';
import speechState from '../../store/atoms/speech';

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
  const { selectedLine } = useRecoilValue(lineState);
  const [{ stations, selectedDirection, arrived }, setStation] = useRecoilState(
    stationState
  );
  const [
    { leftStations, bottomState, trainType },
    setNavigation,
  ] = useRecoilState(navigationState);
  const setSpeech = useSetRecoilState(speechState);

  const hasTerminus = useMemo((): boolean => {
    if (
      isYamanoteLine(selectedLine.id) ||
      (!trainType && selectedLine.id === 11623)
    ) {
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
  }, [leftStations, selectedDirection, selectedLine.id, stations, trainType]);
  const setLocation = useSetRecoilState(locationState);
  const [bgLocation, setBGLocation] = useState<LocationObject>();
  globalSetBGLocation = setBGLocation;
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

  const joinedLineIds = trainType?.lines.map((l) => l.id);
  const currentLine = getCurrentLine(leftStations, joinedLineIds, selectedLine);

  const isInbound = selectedDirection === 'INBOUND';

  const slicedStations = getSlicedStations({
    stations,
    currentStation: leftStations[0],
    isInbound,
    arrived,
    currentLine,
  });

  const nextStopStationIndex = slicedStations.findIndex((s) => {
    if (s.id === leftStations[0]?.id) {
      return false;
    }
    return !s.pass;
  });

  const transferLines = useMemo(() => {
    if (arrived) {
      const currentStation = leftStations[0];
      if (currentStation?.pass) {
        return getNextStationLinesWithoutCurrentLine(
          slicedStations,
          currentLine,
          nextStopStationIndex
        );
      }
      return getCurrentStationLinesWithoutCurrentLine(
        slicedStations,
        currentLine
      );
    }
    return getNextStationLinesWithoutCurrentLine(
      slicedStations,
      currentLine,
      nextStopStationIndex
    );
  }, [
    arrived,
    currentLine,
    leftStations,
    nextStopStationIndex,
    slicedStations,
  ]);

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
          <TouchableWithoutFeedback
            onPress={toTransferState}
            style={styles.touchable}
          >
            <LineBoard
              arrived={arrived}
              selectedLine={selectedLine}
              stations={leftStations}
              hasTerminus={hasTerminus}
              trainType={trainType}
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

export default MainScreen;
