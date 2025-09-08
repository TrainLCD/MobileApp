import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useKeepAwake } from 'expo-keep-awake';
import * as Location from 'expo-location';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { isClip } from 'react-native-app-clip';
import DevOverlay from '~/components/DevOverlay';
import Header from '~/components/Header';
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
import tuningState from '~/store/atoms/tuning';
import { isDevApp } from '~/utils/isDevApp';
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

const MainScreen: React.FC = () => {
  const [isRotated, setIsRotated] = useState(false);

  const theme = useThemeStore();
  const isLEDTheme = theme === APP_THEME.LED;

  const [{ stations, selectedDirection, arrived }, _setStationState] =
    useAtom(stationState);
  const [{ leftStations, bottomState }, setNavigationState] =
    useAtom(navigationState);
  const { devOverlayEnabled } = useAtomValue(tuningState);
  const _setLineState = useSetAtom(lineState);
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

  const _navigation = useNavigation();
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
    const lockOrientationAsync = async () => {
      try {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE_LEFT
        );
      } catch (_e) {
        // ignore and proceed
      } finally {
        // fail-open to avoid blocking UI even if locking fails
        setIsRotated(true);
      }
    };
    lockOrientationAsync();
    return () => {
      ScreenOrientation.unlockAsync().catch(console.error);
    };
  }, []);

  useEffect(() => {
    // 横画面になるのを待たないと2回スクリーンロックがかかる
    if (!isRotated) {
      return;
    }

    if (
      stationsFromCurrentStation.some(
        (s) => s.line?.lineType === LineType.Subway
      )
    ) {
      Alert.alert(translate('subwayAlertTitle'), translate('subwayAlertText'), [
        { text: 'OK' },
      ]);
    }
  }, [stationsFromCurrentStation, isRotated]);

  const isHoliday = useMemo(() => getIsHoliday(new Date()), []);

  useEffect(() => {
    // 横画面になるのを待たないと2回スクリーンロックがかかる
    if (!isRotated) {
      return;
    }

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
  }, [stationsFromCurrentStation, isHoliday, isRotated]);

  const transferLines = useTransferLines();

  const isTypeWillChange = useTypeWillChange();
  const shouldHideTypeChange = useShouldHideTypeChange();

  const updateBottomState = useCallback((): void => {
    pauseBottomTimer();
    setNavigationState((prev) => {
      if (prev.bottomState === 'LINE' && transferLines.length) {
        return {
          ...prev,
          bottomState: 'TRANSFER',
        };
      }

      if (prev.bottomState === 'TRANSFER') {
        if (isTypeWillChange && !shouldHideTypeChange) {
          return {
            ...prev,
            bottomState: 'TYPE_CHANGE',
          };
        }
      }

      return {
        ...prev,
        bottomState: 'LINE',
      };
    });
  }, [
    pauseBottomTimer,
    setNavigationState,
    isTypeWillChange,
    shouldHideTypeChange,
    transferLines.length,
  ]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 確実にアンマウント時に動かしたい
  useEffect(() => {
    return () => {
      resetMainState();
    };
  }, []);

  // const marginForMetroThemeStyle = useMemo(
  //   () => ({
  //     marginTop: theme === APP_THEME.TOKYO_METRO ? -4 : 0, // メトロのヘッダーにある下部の影を相殺する
  //   }),
  //   [theme]
  // );

  useEffect(() => {
    // 横画面になるのを待たないと2回スクリーンロックがかかる
    if (!isRotated) {
      return;
    }

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
  }, [isRotated]);

  const changeOperatingLine = useCallback(async (selectedStation: Station) => {
    const selectedLine = selectedStation.line;
    if (!selectedLine) {
      return;
    }
    // TODO: 実装し直す
    if (isDevApp) {
      Alert.alert('Unimplemented', 'This feature is not implemented yet.');
    }
  }, []);

  const handleTransferPress = useCallback(
    (selectedStation?: Station) => {
      if (untouchableModeEnabled) {
        return;
      }

      if (!selectedStation) {
        updateBottomState();
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
      untouchableModeEnabled,
      changeOperatingLine,
      updateBottomState,
    ]
  );

  const inner = useMemo(() => {
    switch (bottomState) {
      case 'LINE':
        return <LineBoard hasTerminus={hasTerminus} />;
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

        return <Transfers theme={theme} onPress={handleTransferPress} />;
      case 'TYPE_CHANGE':
        return <TypeChangeNotify />;
      default:
        return <></>;
    }
  }, [bottomState, handleTransferPress, hasTerminus, theme, transferStation]);

  if (!isRotated) {
    return null;
  }

  if (isLEDTheme) {
    return (
      <>
        <Header />
        <LineBoard hasTerminus={hasTerminus} />
      </>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={StyleSheet.absoluteFill} onPress={updateBottomState}>
        <Header />
        {inner}
      </Pressable>

      {isDevApp && devOverlayEnabled && <DevOverlay />}
    </View>
  );
};

export default React.memo(MainScreen);
