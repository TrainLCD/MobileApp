import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackActions, useNavigation } from '@react-navigation/native';
import { useKeepAwake } from 'expo-keep-awake';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Alert,
  BackHandler,
  Dimensions,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { isClip } from 'react-native-app-clip';
import { useRecoilState, useSetRecoilState } from 'recoil';
import {
  LineType,
  type Station,
  StopCondition,
} from '../../gen/proto/stationapi_pb';
import LineBoard from '../components/LineBoard';
import Transfers from '../components/Transfers';
import TransfersYamanote from '../components/TransfersYamanote';
import TypeChangeNotify from '../components/TypeChangeNotify';
import { ASYNC_STORAGE_KEYS } from '../constants';
import { useApplicationFlagStore } from '../hooks/useApplicationFlagStore';
import useAutoMode from '../hooks/useAutoMode';
import { useCurrentLine } from '../hooks/useCurrentLine';
import { useCurrentStation } from '../hooks/useCurrentStation';
import { useLoopLine } from '../hooks/useLoopLine';
import { useNextStation } from '../hooks/useNextStation';
import useRefreshLeftStations from '../hooks/useRefreshLeftStations';
import useRefreshStation from '../hooks/useRefreshStation';
import { useResetMainState } from '../hooks/useResetMainState';
import useShouldHideTypeChange from '../hooks/useShouldHideTypeChange';
import { useStartBackgroundLocationUpdates } from '../hooks/useStartBackgroundLocationUpdates';
import { useTTS } from '../hooks/useTTS';
import { useThemeStore } from '../hooks/useThemeStore';
import useTransferLines from '../hooks/useTransferLines';
import useTransitionHeaderState from '../hooks/useTransitionHeaderState';
import { useTypeWillChange } from '../hooks/useTypeWillChange';
import { useUpdateBottomState } from '../hooks/useUpdateBottomState';
import { useUpdateLiveActivities } from '../hooks/useUpdateLiveActivities';
import { APP_THEME } from '../models/Theme';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { isJapanese, translate } from '../translation';
import getCurrentStationIndex from '../utils/currentStationIndex';
import { getIsHoliday } from '../utils/isHoliday';
import getIsPass from '../utils/isPass';
import lineState from '../store/atoms/line';

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
    useRecoilState(stationState);
  const [{ leftStations, bottomState }, setNavigationState] =
    useRecoilState(navigationState);
  const setLineState = useSetRecoilState(lineState);

  const currentLine = useCurrentLine();
  const currentStation = useCurrentStation();

  const autoModeEnabled = useApplicationFlagStore(
    (state) => state.autoModeEnabled
  );

  const nextStation = useNextStation();

  useAutoMode(autoModeEnabled);
  // useSimulationMode(autoModeEnabled);

  const { isYamanoteLine, isOsakaLoopLine, isMeijoLine } = useLoopLine();

  const currentStationRef = useRef(currentStation);
  const stationsRef = useRef(stations);

  const hasTerminus = useMemo((): boolean => {
    if (!currentLine || isYamanoteLine || isOsakaLoopLine || isMeijoLine) {
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

  useEffect(() => {
    if (
      stationsFromCurrentStation.findIndex(
        (s) => s.stopCondition === StopCondition.Weekday
      ) !== -1 &&
      getIsHoliday()
    ) {
      Alert.alert(translate('notice'), translate('holidayNotice'));
    }
    if (
      stationsFromCurrentStation.findIndex(
        (s) => s.stopCondition === StopCondition.Holiday
      ) !== -1 &&
      !getIsHoliday()
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
  }, [stationsFromCurrentStation]);

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

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        resetMainState();
        navigation.dispatch(
          StackActions.replace('MainStack', { screen: 'SelectBound' })
        );
        return true;
      }
    );
    return subscription.remove;
  }, [navigation, resetMainState]);

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
          translate('annoucementTitle'),
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
                  await Location.requestBackgroundPermissionsAsync();
                } catch (error) {
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
        averageDistance: null,
        stations: [],
      }));
      navigation.navigate('SelectBound' as never);
    },
    [navigation, setLineState, setNavigationState, setStationState]
  );

  const handleTransferPress = useCallback(
    (selectedStation: Station | undefined) => {
      if (!selectedStation) {
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
    [currentLine, changeOperatingLine]
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
            onPress={isTypeWillChange ? toTypeChangeState : toLineState}
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
