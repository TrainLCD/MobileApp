import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackActions, useNavigation } from '@react-navigation/native';
import { useKeepAwake } from 'expo-keep-awake';
import * as Location from 'expo-location';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Alert,
  Dimensions,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { isClip } from 'react-native-app-clip';
import {
  LineType,
  type Station,
  StopCondition,
} from '~/gen/proto/stationapi_pb';
import {
  useAutoMode,
  useCurrentLine,
  useCurrentStation,
  useCurrentTrainType,
  useFirstStop,
  useLoopLine,
  useNextStation,
  useRefreshLeftStations,
  useRefreshStation,
  useResetMainState,
  useShouldHideTypeChange,
  useSimulationMode,
  useStartBackgroundLocationUpdates,
  useTelemetrySender,
  useThemeStore,
  useTransferLines,
  useTransitionHeaderState,
  useTTS,
  useTypeWillChange,
  useUpdateBottomState,
  useUpdateLiveActivities,
} from '~/hooks';
import { getIsHoliday } from '~/utils/isHoliday';
import { requestIgnoreBatteryOptimizationsAndroid } from '~/utils/native/android/ignoreBatteryOptimizationsModule';
import LineBoard from '../components/LineBoard';
import Transfers from '../components/Transfers';
import TransfersYamanote from '../components/TransfersYamanote';
import TypeChangeNotify from '../components/TypeChangeNotify';
import { ASYNC_STORAGE_KEYS } from '../constants';
import { APP_THEME } from '../models/Theme';
import lineState from '../store/atoms/line';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { isJapanese, translate } from '../translation';
import getCurrentStationIndex from '../utils/currentStationIndex';
import getIsPass from '../utils/isPass';
import { getIsLocal } from '../utils/trainTypeString';
import tuningState from '~/store/atoms/tuning';

const { height: screenHeight } = Dimensions.get('screen');

const styles = StyleSheet.create({
  touchable: {
    height: screenHeight - 128,
  },
});

const MainScreen: React.FC = () => {
  const theme = useThemeStore();
  const isLEDTheme = theme === APP_THEME.LED;

  const [{ stations, selectedDirection, arrived }, setStationState] =
    useAtom(stationState);
  const [{ leftStations, bottomState }, setNavigationState] =
    useAtom(navigationState);
  const setLineState = useSetAtom(lineState);
  const { untouchableModeEnabled } = useAtomValue(tuningState);

  const currentLine = useCurrentLine();
  const currentStation = useCurrentStation();
  const trainType = useCurrentTrainType();

  const nextStation = useNextStation();

  useAutoMode();
  useSimulationMode();
  useFirstStop(true);

  useTelemetrySender(true);

  const { isYamanoteLine, isOsakaLoopLine, isMeijoLine } = useLoopLine();

  const currentStationRef = useRef(currentStation);
  const stationsRef = useRef(stations);

  const hasTerminus = useMemo((): boolean => {
    if (
      (!currentLine || isYamanoteLine || isOsakaLoopLine || isMeijoLine) &&
      getIsLocal(trainType)
    ) {
      return false;
    }
    if (selectedDirection === 'INBOUND') {
      return leftStations
        .slice(0, 8)
        .some((ls) => ls.id === stations[stations.length - 1]?.id);
    }

    return leftStations
      .slice(0, 8)
      .some(
        (ls) => ls.id === stations.slice().reverse()[stations.length - 1]?.id
      );
  }, [
    currentLine,
    isYamanoteLine,
    isOsakaLoopLine,
    isMeijoLine,
    selectedDirection,
    leftStations,
    stations,
    trainType,
  ]);

  const navigation = useNavigation();
  useTransitionHeaderState();
  useRefreshLeftStations();
  useRefreshStation();
  useKeepAwake();
  useStartBackgroundLocationUpdates();
  const resetMainState = useResetMainState();
  useTTS();
  useUpdateLiveActivities();

  const { pause: pauseBottomTimer } = useUpdateBottomState();

  const transferStation = useMemo(
    () =>
      arrived && currentStation && !getIsPass(currentStation)
        ? currentStation
        : (nextStation ?? null),
    [arrived, nextStation, currentStation]
  );

  const stationsFromCurrentStation = useMemo(() => {
    if (!selectedDirection) {
      return [];
    }
    const currentStationIndex = getCurrentStationIndex(
      stationsRef.current,
      currentStationRef.current
    );
    return selectedDirection === 'INBOUND'
      ? stationsRef.current.slice(currentStationIndex)
      : stationsRef.current.slice(0, currentStationIndex + 1);
  }, [selectedDirection]);

  useEffect(() => {
    if (
      stationsFromCurrentStation.some(
        (s) => s.line?.lineType === LineType.Subway
      )
    ) {
      Alert.alert(translate('subwayAlertTitle'), translate('subwayAlertText'), [
        { text: 'OK' },
      ]);
    }
  }, [stationsFromCurrentStation]);

  const isHoliday = useMemo(() => getIsHoliday(new Date()), []);

  useEffect(() => {
    if (
      stationsFromCurrentStation.some(
        (s) => s.stopCondition === StopCondition.Weekday
      ) &&
      isHoliday
    ) {
      Alert.alert(translate('notice'), translate('holidayNotice'));
    }
    if (
      stationsFromCurrentStation.some(
        (s) => s.stopCondition === StopCondition.Holiday
      ) &&
      !isHoliday
    ) {
      Alert.alert(translate('notice'), translate('weekdayNotice'));
    }

    if (
      stationsFromCurrentStation.findIndex(
        (s) => s.stopCondition === StopCondition.Partial
      ) !== -1
    ) {
      Alert.alert(translate('notice'), translate('partiallyPassNotice'));
    }
  }, [stationsFromCurrentStation, isHoliday]);

  const transferLines = useTransferLines();

  const toTransferState = useCallback((): void => {
    if (transferLines.length) {
      pauseBottomTimer();
      setNavigationState((prev) => ({
        ...prev,
        bottomState: 'TRANSFER',
      }));
    }
  }, [pauseBottomTimer, setNavigationState, transferLines.length]);

  const toLineState = useCallback((): void => {
    pauseBottomTimer();
    setNavigationState((prev) => ({
      ...prev,
      bottomState: 'LINE',
    }));
  }, [pauseBottomTimer, setNavigationState]);

  const isTypeWillChange = useTypeWillChange();
  const shouldHideTypeChange = useShouldHideTypeChange();

  const toTypeChangeState = useCallback(() => {
    if (!isTypeWillChange || shouldHideTypeChange) {
      pauseBottomTimer();
      setNavigationState((prev) => ({
        ...prev,
        bottomState: 'LINE',
      }));
      return;
    }
    setNavigationState((prev) => ({
      ...prev,
      bottomState: 'TYPE_CHANGE',
    }));
  }, [
    isTypeWillChange,
    pauseBottomTimer,
    setNavigationState,
    shouldHideTypeChange,
  ]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 確実にアンマウント時に動かしたい
  useEffect(() => {
    return () => {
      resetMainState();
    };
  }, []);

  const marginForMetroThemeStyle = useMemo(
    () => ({
      marginTop: theme === APP_THEME.TOKYO_METRO ? -4 : 0, // メトロのヘッダーにある下部の影を相殺する
    }),
    [theme]
  );

  useEffect(() => {
    const f = async (): Promise<void> => {
      const warningDismissed = await AsyncStorage.getItem(
        ASYNC_STORAGE_KEYS.ALWAYS_PERMISSION_NOT_GRANTED_WARNING_DISMISSED
      );
      // NOTE: フォアグラウンドも許可しない設定の場合はそもそもオートモード前提で使われていると思うので警告は不要
      const fgPermStatus = await Location.getForegroundPermissionsAsync();
      if (!fgPermStatus.granted) {
        return;
      }

      const bgPermStatus = await Location.getBackgroundPermissionsAsync();
      if (warningDismissed !== 'true' && !bgPermStatus?.granted && !isClip()) {
        Alert.alert(
          translate('announcementTitle'),
          translate('alwaysPermissionNotGrantedAlertText'),
          [
            {
              text: translate('doNotShowAgain'),
              style: 'cancel',
              onPress: async (): Promise<void> => {
                await AsyncStorage.setItem(
                  ASYNC_STORAGE_KEYS.ALWAYS_PERMISSION_NOT_GRANTED_WARNING_DISMISSED,
                  'true'
                );
              },
            },
            {
              text: 'OK',
              onPress: async () => {
                try {
                  const { status } =
                    await Location.requestBackgroundPermissionsAsync();
                  if (status === 'granted') {
                    await requestIgnoreBatteryOptimizationsAndroid();
                  }
                } catch (_error) {
                  Alert.alert(
                    translate('errorTitle'),
                    translate('failedToRequestPermission'),
                    [{ text: 'OK' }]
                  );
                }
              },
            },
          ]
        );
      }

      if (Platform.OS === 'android' && bgPermStatus.granted) {
        const { status: bgStatus } =
          await Location.getBackgroundPermissionsAsync();
        const dozeAlertDismissed = await AsyncStorage.getItem(
          ASYNC_STORAGE_KEYS.DOZE_CONFIRMED
        );
        if (bgStatus === 'granted' && dozeAlertDismissed !== 'true') {
          Alert.alert(
            translate('announcementTitle'),
            translate('dozeAlertText'),
            [
              {
                text: translate('doNotShowAgain'),
                style: 'cancel',
                onPress: async (): Promise<void> => {
                  await AsyncStorage.setItem(
                    ASYNC_STORAGE_KEYS.DOZE_CONFIRMED,
                    'true'
                  );
                },
              },
              {
                text: 'OK',
                onPress: async () => {
                  try {
                    await Linking.openSettings();
                  } catch (_error) {
                    Alert.alert(
                      translate('announcementTitle'),
                      translate('failedToOpenSettings'),
                      [{ text: 'OK' }]
                    );
                  }
                },
              },
            ]
          );
        }
      }
    };
    f();
  }, []);

  const changeOperatingLine = useCallback(
    async (selectedStation: Station) => {
      const selectedLine = selectedStation.line;
      if (!selectedLine) {
        return;
      }

      setLineState((prev) => ({ ...prev, selectedLine }));
      setNavigationState((prev) => ({
        ...prev,
        trainType: selectedStation.trainType ?? null,
        stationForHeader: selectedStation,
        headerState: isJapanese ? 'CURRENT' : 'CURRENT_EN',
        bottomState: 'LINE',
        leftStations: [],
      }));
      setStationState((prev) => ({
        ...prev,
        station: selectedStation,
        selectedDirection: null,
        selectedBound: null,
        arrived: true,
        approaching: false,
        stations: [],
        wantedDestination: null,
      }));
      navigation.dispatch(StackActions.replace('SelectBound'));
    },
    [navigation, setLineState, setNavigationState, setStationState]
  );

  const handleTransferPress = useCallback(
    (selectedStation?: Station) => {
      if (untouchableModeEnabled) {
        return;
      }

      if (!selectedStation) {
        isTypeWillChange ? toTypeChangeState() : toLineState();
        return;
      }

      Alert.alert(
        translate('confirmChangeLineTitle', {
          lineName:
            (isJapanese
              ? selectedStation.line?.nameShort
              : selectedStation.line?.nameRoman) ?? '',
        }),
        translate('confirmChangeLineText', {
          currentLineName:
            (isJapanese ? currentLine?.nameShort : currentLine?.nameRoman) ??
            '',
          lineName:
            (isJapanese
              ? selectedStation.line?.nameShort
              : selectedStation.line?.nameRoman) ?? '',
        }),
        [
          {
            text: translate('cancel'),
            style: 'cancel',
          },
          {
            text: 'OK',
            onPress: () => {
              changeOperatingLine(selectedStation);
            },
          },
        ]
      );
    },
    [
      currentLine,
      isTypeWillChange,
      untouchableModeEnabled,
      changeOperatingLine,
      toTypeChangeState,
      toLineState,
    ]
  );

  if (isLEDTheme) {
    return <LineBoard />;
  }

  switch (bottomState) {
    case 'LINE':
      return (
        <View
          style={{
            flex: 1,
            ...marginForMetroThemeStyle,
          }}
        >
          <Pressable
            style={styles.touchable}
            onPress={transferLines.length ? toTransferState : toTypeChangeState}
          >
            <LineBoard hasTerminus={hasTerminus} />
          </Pressable>
        </View>
      );
    case 'TRANSFER':
      if (!transferStation) {
        return null;
      }
      if (theme === APP_THEME.YAMANOTE || theme === APP_THEME.JO) {
        return (
          <TransfersYamanote
            onPress={handleTransferPress}
            station={transferStation}
          />
        );
      }

      return (
        <View style={[styles.touchable, marginForMetroThemeStyle]}>
          <Transfers theme={theme} onPress={handleTransferPress} />
        </View>
      );
    case 'TYPE_CHANGE':
      return (
        <View style={[styles.touchable, marginForMetroThemeStyle]}>
          <Pressable onPress={toLineState} style={styles.touchable}>
            <TypeChangeNotify />
          </Pressable>
        </View>
      );
    default:
      return <></>;
  }
};

export default React.memo(MainScreen);
