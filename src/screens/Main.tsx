import { useLazyQuery } from '@apollo/client/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { Alert, Linking, Platform, Pressable, StyleSheet } from 'react-native';
import { isClip } from 'react-native-app-clip';
import {
  LineType,
  type Station,
  StopCondition,
  type TrainType,
} from '~/@types/graphql';
import DevOverlay from '~/components/DevOverlay';
import Header from '~/components/Header';
import { SelectBoundModal } from '~/components/SelectBoundModal';
import { ASYNC_STORAGE_KEYS } from '~/constants';
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
import {
  GET_LINE_GROUP_STATIONS,
  GET_LINE_STATIONS,
} from '~/lib/graphql/queries';
import { APP_THEME } from '~/models/Theme';
import lineState from '~/store/atoms/line';
import tuningState from '~/store/atoms/tuning';
import { isJapanese, translate } from '~/translation';
import { isDevApp } from '~/utils/isDevApp';
import { getIsHoliday } from '~/utils/isHoliday';
import { requestIgnoreBatteryOptimizationsAndroid } from '~/utils/native/android/ignoreBatteryOptimizationsModule';
import { getIsLocal } from '~/utils/trainTypeString';
import LineBoard from '../components/LineBoard';
import Transfers from '../components/Transfers';
import TransfersYamanote from '../components/TransfersYamanote';
import TypeChangeNotify from '../components/TypeChangeNotify';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import getCurrentStationIndex from '../utils/currentStationIndex';
import getIsPass from '../utils/isPass';

type GetLineGroupStationsData = {
  lineGroupStations: Station[];
};

type GetLineGroupStationsVariables = {
  lineGroupId: number;
};

type GetLineStationsData = {
  lineStations: Station[];
};

type GetLineStationsVariables = {
  lineId: number;
  stationId?: number;
};

const MainScreen: React.FC = () => {
  const [isRotated, setIsRotated] = useState(false);
  const [isSelectBoundModalOpen, setIsSelectBoundModalOpen] = useState(false);

  const theme = useThemeStore();
  const isLEDTheme = theme === APP_THEME.LED;

  const [{ stations, selectedDirection, arrived }, setStationState] =
    useAtom(stationState);
  const [{ leftStations, bottomState }, setNavigationState] =
    useAtom(navigationState);
  const setLineState = useSetAtom(lineState);
  const { devOverlayEnabled } = useAtomValue(tuningState);
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

  const [
    fetchStationsByLineGroupId,
    {
      loading: fetchStationsByLineGroupIdLoading,
      error: fetchStationsByLineGroupIdError,
    },
  ] = useLazyQuery<GetLineGroupStationsData, GetLineGroupStationsVariables>(
    GET_LINE_GROUP_STATIONS
  );

  const [
    fetchStationsByLineId,
    {
      loading: fetchStationsByLineIdLoading,
      error: fetchStationsByLineIdError,
    },
  ] = useLazyQuery<GetLineStationsData, GetLineStationsVariables>(
    GET_LINE_STATIONS
  );

  const currentStationRef = useRef(currentStation);
  const stationsRef = useRef(stations);

  const handleCloseSelectBoundModal = useCallback(() => {
    setIsSelectBoundModalOpen(false);
    ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.LANDSCAPE
    ).catch(console.error);
  }, []);

  const handleTrainTypeSelect = useCallback(
    async (trainType: TrainType) => {
      if (trainType.groupId == null) return;
      const res = await fetchStationsByLineGroupId({
        variables: {
          lineGroupId: trainType.groupId,
        },
      });
      setStationState((prev) => ({
        ...prev,
        pendingStations: res.data?.lineGroupStations ?? [],
      }));
      setNavigationState((prev) => ({
        ...prev,
        trainType,
      }));
    },
    [fetchStationsByLineGroupId, setStationState, setNavigationState]
  );

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
          ScreenOrientation.OrientationLock.LANDSCAPE
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
      const alertAsync = async () => {
        const subwayAlertDismissed = await AsyncStorage.getItem(
          ASYNC_STORAGE_KEYS.SUBWAY_ALERT_DISMISSED
        );

        if (subwayAlertDismissed !== 'true') {
          Alert.alert(
            translate('subwayAlertTitle'),
            translate('subwayAlertText'),
            [
              {
                text: translate('doNotShowAgain'),
                style: 'cancel',
                onPress: async (): Promise<void> => {
                  await AsyncStorage.setItem(
                    ASYNC_STORAGE_KEYS.SUBWAY_ALERT_DISMISSED,
                    'true'
                  );
                },
              },
              { text: 'OK' },
            ]
          );
        }
      };

      alertAsync();
    }
  }, [stationsFromCurrentStation, isRotated]);

  const isHoliday = useMemo(() => getIsHoliday(new Date()), []);

  useEffect(() => {
    // 横画面になるのを待たないと2回スクリーンロックがかかる
    if (!isRotated) {
      return;
    }

    const alertAsync = async () => {
      // 土休日通過
      const holidayNoticeDismissed = await AsyncStorage.getItem(
        ASYNC_STORAGE_KEYS.HOLIDAY_ALERT_DISMISSED
      );
      if (
        stationsFromCurrentStation.some(
          (s) => s.stopCondition === StopCondition.Weekday
        ) &&
        isHoliday &&
        holidayNoticeDismissed !== 'true'
      ) {
        Alert.alert(translate('notice'), translate('holidayNotice'), [
          {
            text: translate('doNotShowAgain'),
            style: 'cancel',
            onPress: async (): Promise<void> => {
              await AsyncStorage.setItem(
                ASYNC_STORAGE_KEYS.HOLIDAY_ALERT_DISMISSED,
                'true'
              );
            },
          },
          { text: 'OK' },
        ]);
      }

      // 平日通過
      const weekdayNoticeDismissed = await AsyncStorage.getItem(
        ASYNC_STORAGE_KEYS.WEEKDAY_ALERT_DISMISSED
      );

      if (
        stationsFromCurrentStation.some(
          (s) => s.stopCondition === StopCondition.Holiday
        ) &&
        !isHoliday &&
        weekdayNoticeDismissed !== 'true'
      ) {
        Alert.alert(translate('notice'), translate('weekdayNotice'), [
          {
            text: translate('doNotShowAgain'),
            style: 'cancel',
            onPress: async (): Promise<void> => {
              await AsyncStorage.setItem(
                ASYNC_STORAGE_KEYS.WEEKDAY_ALERT_DISMISSED,
                'true'
              );
            },
          },
          { text: 'OK' },
        ]);
      }

      // 一部通過
      const partiallyPassNoticeDismissed = await AsyncStorage.getItem(
        ASYNC_STORAGE_KEYS.PARTIALLY_PASS_ALERT_DISMISSED
      );
      if (
        stationsFromCurrentStation.findIndex(
          (s) => s.stopCondition === StopCondition.Partial
        ) !== -1 &&
        partiallyPassNoticeDismissed !== 'true'
      ) {
        Alert.alert(translate('notice'), translate('partiallyPassNotice'), [
          {
            text: translate('doNotShowAgain'),
            style: 'cancel',
            onPress: async (): Promise<void> => {
              await AsyncStorage.setItem(
                ASYNC_STORAGE_KEYS.PARTIALLY_PASS_ALERT_DISMISSED,
                'true'
              );
            },
          },
          { text: 'OK' },
        ]);
      }
    };
    alertAsync();
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

  const changeOperatingLine = useCallback(
    async (selectedStation: Station) => {
      const selectedLine = selectedStation.line;
      if (!selectedStation.id || !selectedLine?.id) {
        return;
      }

      await ScreenOrientation.unlockAsync().catch(console.error);

      setIsSelectBoundModalOpen(true);

      const { data } = await fetchStationsByLineId({
        variables: { lineId: selectedLine.id, stationId: selectedStation.id },
      });

      setLineState((prev) => ({ ...prev, pendingLine: selectedLine }));
      setStationState((prev) => ({
        ...prev,
        pendingStation: selectedStation,
        pendingStations: data?.lineStations ?? [],
      }));
    },
    [setStationState, setLineState, fetchStationsByLineId]
  );

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
    <>
      <Pressable style={StyleSheet.absoluteFill} onPress={updateBottomState}>
        <Header />
        {inner}
      </Pressable>

      <SelectBoundModal
        visible={isSelectBoundModalOpen}
        onClose={handleCloseSelectBoundModal}
        onBoundSelect={handleCloseSelectBoundModal}
        onTrainTypeSelect={handleTrainTypeSelect}
        loading={
          fetchStationsByLineGroupIdLoading || fetchStationsByLineIdLoading
        }
        error={
          fetchStationsByLineGroupIdError || fetchStationsByLineIdError || null
        }
      />

      {isDevApp && devOverlayEnabled && <DevOverlay />}
    </>
  );
};

export default React.memo(MainScreen);
