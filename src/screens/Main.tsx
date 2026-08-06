import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useAtomValue, useSetAtom } from 'jotai';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import { isClip } from 'react-native-app-clip';
import {
  LineType,
  type Station,
  StopCondition,
  type TrainType,
} from '~/@types/graphql';
import AndroidPictureInPictureView from '~/components/AndroidPictureInPictureView';
import DevOverlay from '~/components/DevOverlay';
import { FxTTS } from '~/components/FxTTS';
import Header from '~/components/Header';
import { SelectBoundModal } from '~/components/SelectBoundModal';
import { IS_LIVE_UPDATE_ELIGIBLE_PLATFORM, STORAGE_KEYS } from '~/constants';
import {
  useAndroidPictureInPicture,
  useConsoleTelemetry,
  useCurrentLine,
  useCurrentStation,
  useCurrentTrainType,
  useEnsureSelectLineInHistory,
  useEtaAnchor,
  useEtaFallback,
  useFirstStop,
  useKeepAwake,
  useLazyGraphQLQuery,
  useLoopLine,
  useNextStation,
  useRefreshLeftStations,
  useRefreshStation,
  useResetMainState,
  useShouldHideTypeChange,
  useSimulationMode,
  useStartBackgroundLocationUpdates,
  useTelemetrySender,
  useTransferLines,
  useTransitionHeaderState,
  useTypeWillChange,
  useUpdateBottomState,
  useUpdateLiveActivities,
} from '~/hooks';
import {
  GET_LINE_GROUP_STATIONS,
  GET_LINE_STATIONS,
  GET_STATION_TRAIN_TYPES_LIGHT,
} from '~/lib/graphql/queries';
import { storage } from '~/lib/storage';
import { getLineSymbolImage } from '~/lineSymbolImage';
import { APP_THEME } from '~/models/Theme';
import { portraitModeEnabledAtom } from '~/store/atoms/experimental';
import lineState from '~/store/atoms/line';
import { isLEDThemeAtom, themeAtom } from '~/store/atoms/theme';
import tuningState from '~/store/atoms/tuning';
import { isJapanese, translate } from '~/translation';
import { isDevApp } from '~/utils/isDevApp';
import { getIsHoliday } from '~/utils/isHoliday';
import { requestIgnoreBatteryOptimizationsAndroid } from '~/utils/native/android/ignoreBatteryOptimizationsModule';
import { getIsLocal } from '~/utils/trainTypeString';
import LineBoard from '../components/LineBoard';
import PortraitMain from '../components/PortraitMain';
import Transfers from '../components/Transfers';
import TransfersYamanote from '../components/TransfersYamanote';
import TypeChangeNotify from '../components/TypeChangeNotify';
import navigationState, {
  bottomStateAtom,
  leftStationsAtom,
} from '../store/atoms/navigation';
import { pictureInPictureActiveAtom } from '../store/atoms/pictureInPicture';
import stationState, {
  arrivedAtom,
  selectedDirectionAtom,
  stationsAtom,
} from '../store/atoms/station';
import getCurrentStationIndex from '../utils/currentStationIndex';
import {
  showDialog,
  showDialogWhilePresenting,
} from '../utils/dialogPresentation';
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

type GetStationTrainTypesData = {
  stationTrainTypes: TrainType[];
};

type GetStationTrainTypesVariables = {
  stationId: number;
};

// MainScreen 本体から切り離したレンダーレスの副作用ホスト。
// ここに集約したフックは locationAtom や headerState など高頻度更新の atom を
// 購読するため、MainScreen 本体に置くと位置更新（毎秒）のたびに約40フックの
// 巨大コンポーネント全体が再実行されてしまう。返り値を持たない副作用専用
// フックだけをここへ隔離する。
const FxSimulationMode: React.FC = () => {
  useSimulationMode();
  return null;
};
const FxFirstStop: React.FC = () => {
  useFirstStop(true);
  return null;
};
const FxTelemetrySender: React.FC = () => {
  useTelemetrySender(true);
  return null;
};
const FxConsoleTelemetry: React.FC = () => {
  useConsoleTelemetry();
  return null;
};
const FxTransitionHeaderState: React.FC = () => {
  useTransitionHeaderState();
  return null;
};
const FxRefreshLeftStations: React.FC = () => {
  useRefreshLeftStations();
  return null;
};
const FxRefreshStation: React.FC = () => {
  useRefreshStation();
  return null;
};
const FxEtaAnchor: React.FC = () => {
  useEtaAnchor();
  return null;
};
const FxEtaFallback: React.FC = () => {
  useEtaFallback();
  return null;
};
const FxKeepAwake: React.FC = () => {
  useKeepAwake();
  return null;
};
const FxStartBackgroundLocationUpdates: React.FC = () => {
  useStartBackgroundLocationUpdates();
  return null;
};
const FxUpdateLiveActivitiesInner: React.FC = () => {
  useUpdateLiveActivities();
  return null;
};
// LiveActivities は iOS 専用、Android のライブアップデートは Android 16(API 36) 以降専用。
// どちらの通知先も持たない端末では activityState の派生計算自体を止める。
const FxUpdateLiveActivities: React.FC = () => {
  return Platform.OS === 'ios' || IS_LIVE_UPDATE_ELIGIBLE_PLATFORM ? (
    <FxUpdateLiveActivitiesInner />
  ) : null;
};
const FxAndroidPictureInPicture: React.FC = () => {
  useAndroidPictureInPicture();
  return null;
};

const MainScreenEffects: React.FC = () => {
  return (
    <>
      <FxSimulationMode />
      <FxFirstStop />
      <FxTelemetrySender />
      <FxConsoleTelemetry />
      <FxTransitionHeaderState />
      <FxRefreshLeftStations />
      <FxRefreshStation />
      <FxEtaAnchor />
      <FxEtaFallback />
      <FxKeepAwake />
      <FxStartBackgroundLocationUpdates />
      <FxTTS />
      <FxUpdateLiveActivities />
      {Platform.OS === 'android' && <FxAndroidPictureInPicture />}
    </>
  );
};

const MainScreen: React.FC = () => {
  const [isSelectBoundModalOpen, setIsSelectBoundModalOpen] = useState(false);

  const theme = useAtomValue(themeAtom);
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const pictureInPictureActive = useAtomValue(pictureInPictureActiveAtom);

  const stations = useAtomValue(stationsAtom);
  const selectedDirection = useAtomValue(selectedDirectionAtom);
  const arrived = useAtomValue(arrivedAtom);
  const setStationState = useSetAtom(stationState);
  const leftStations = useAtomValue(leftStationsAtom);
  const bottomState = useAtomValue(bottomStateAtom);
  const setNavigationState = useSetAtom(navigationState);
  const setLineState = useSetAtom(lineState);
  const { devOverlayEnabled, untouchableModeEnabled } =
    useAtomValue(tuningState);
  const portraitModeEnabled = useAtomValue(portraitModeEnabledAtom);

  const currentLine = useCurrentLine();
  const currentStation = useCurrentStation();
  const trainType = useCurrentTrainType();
  const nextStation = useNextStation();

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // OS 側で orientation lock せず、物理的に portrait のときはコンテンツ側を 90deg
  // 回転して横長レイアウトを維持する。端末の回転ロック ON でも横表示を保てる。
  const landscapeKeepStyle = useMemo<ViewStyle>(() => {
    if (windowHeight <= windowWidth) {
      return StyleSheet.absoluteFillObject;
    }
    return {
      position: 'absolute',
      top: (windowHeight - windowWidth) / 2,
      left: (windowWidth - windowHeight) / 2,
      width: windowHeight,
      height: windowWidth,
      transform: [{ rotate: '90deg' }],
    };
  }, [windowWidth, windowHeight]);

  const { isYamanoteLine, isOsakaLoopLine, isMeijoLine } = useLoopLine();

  const [
    fetchStationsByLineGroupId,
    {
      loading: fetchStationsByLineGroupIdLoading,
      error: fetchStationsByLineGroupIdError,
    },
  ] = useLazyGraphQLQuery<
    GetLineGroupStationsData,
    GetLineGroupStationsVariables
  >(GET_LINE_GROUP_STATIONS);

  const [
    fetchStationsByLineId,
    {
      loading: fetchStationsByLineIdLoading,
      error: fetchStationsByLineIdError,
    },
  ] = useLazyGraphQLQuery<GetLineStationsData, GetLineStationsVariables>(
    GET_LINE_STATIONS
  );

  const [
    fetchTrainTypes,
    { loading: fetchTrainTypesLoading, error: fetchTrainTypesError },
  ] = useLazyGraphQLQuery<
    GetStationTrainTypesData,
    GetStationTrainTypesVariables
  >(GET_STATION_TRAIN_TYPES_LIGHT);

  const currentStationRef = useRef(currentStation);
  const stationsRef = useRef(stations);
  const navigation = useNavigation();

  // Activity再生成からの復帰などでスタックがMain単独になった場合に
  // SelectLineを履歴へ復元し、戻る操作でアプリが落ちないようにする
  useEnsureSelectLineInHistory();

  const handleCloseSelectBoundModal = useCallback(() => {
    setIsSelectBoundModalOpen(false);
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
        pendingTrainType: trainType,
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
    // INBOUND は最終駅、OUTBOUND は始発駅が終点。
    // 以前は OUTBOUND 側で stations.slice().reverse()[length-1] と書いていたが、
    // これは単に stations[0] と等価なので reverse 全配列コピーは丸ごと無駄だった。
    const terminusId =
      selectedDirection === 'INBOUND'
        ? stations[stations.length - 1]?.id
        : stations[0]?.id;
    if (terminusId == null) {
      return false;
    }

    const limit = Math.min(8, leftStations.length);
    for (let i = 0; i < limit; i++) {
      if (leftStations[i]?.id === terminusId) {
        return true;
      }
    }
    return false;
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

  const resetMainState = useResetMainState();

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
      const subwayAlertDismissed = storage.getString(
        STORAGE_KEYS.SUBWAY_ALERT_DISMISSED
      );

      if (subwayAlertDismissed !== 'true') {
        showDialogWhilePresenting(
          STORAGE_KEYS.SUBWAY_ALERT_DISMISSED,
          translate('subwayAlertTitle'),
          translate('subwayAlertText'),
          [
            {
              text: translate('doNotShowAgain'),
              style: 'checkbox',
              onPress: (): void => {
                storage.set(STORAGE_KEYS.SUBWAY_ALERT_DISMISSED, 'true');
              },
            },
            { text: 'OK' },
          ]
        );
      }
    }
  }, [stationsFromCurrentStation]);

  const isHoliday = useMemo(() => getIsHoliday(new Date()), []);

  useEffect(() => {
    // 土休日通過
    const holidayNoticeDismissed = storage.getString(
      STORAGE_KEYS.HOLIDAY_ALERT_DISMISSED
    );
    if (
      stationsFromCurrentStation.some(
        (s) => s.stopCondition === StopCondition.Weekday
      ) &&
      isHoliday &&
      holidayNoticeDismissed !== 'true'
    ) {
      showDialogWhilePresenting(
        STORAGE_KEYS.HOLIDAY_ALERT_DISMISSED,
        translate('notice'),
        translate('holidayNotice'),
        [
          {
            text: translate('doNotShowAgain'),
            style: 'checkbox',
            onPress: (): void => {
              storage.set(STORAGE_KEYS.HOLIDAY_ALERT_DISMISSED, 'true');
            },
          },
          { text: 'OK' },
        ]
      );
    }

    // 平日通過
    const weekdayNoticeDismissed = storage.getString(
      STORAGE_KEYS.WEEKDAY_ALERT_DISMISSED
    );

    if (
      stationsFromCurrentStation.some(
        (s) => s.stopCondition === StopCondition.Holiday
      ) &&
      !isHoliday &&
      weekdayNoticeDismissed !== 'true'
    ) {
      showDialogWhilePresenting(
        STORAGE_KEYS.WEEKDAY_ALERT_DISMISSED,
        translate('notice'),
        translate('weekdayNotice'),
        [
          {
            text: translate('doNotShowAgain'),
            style: 'checkbox',
            onPress: (): void => {
              storage.set(STORAGE_KEYS.WEEKDAY_ALERT_DISMISSED, 'true');
            },
          },
          { text: 'OK' },
        ]
      );
    }

    // 一部通過
    const partiallyPassNoticeDismissed = storage.getString(
      STORAGE_KEYS.PARTIALLY_PASS_ALERT_DISMISSED
    );
    if (
      stationsFromCurrentStation.findIndex(
        (s) => s.stopCondition === StopCondition.Partial
      ) !== -1 &&
      partiallyPassNoticeDismissed !== 'true'
    ) {
      showDialogWhilePresenting(
        STORAGE_KEYS.PARTIALLY_PASS_ALERT_DISMISSED,
        translate('notice'),
        translate('partiallyPassNotice'),
        [
          {
            text: translate('doNotShowAgain'),
            style: 'checkbox',
            onPress: (): void => {
              storage.set(STORAGE_KEYS.PARTIALLY_PASS_ALERT_DISMISSED, 'true');
            },
          },
          { text: 'OK' },
        ]
      );
    }
  }, [stationsFromCurrentStation, isHoliday]);

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

      if (
        prev.bottomState === 'LINE' &&
        !transferLines.length &&
        isTypeWillChange &&
        !shouldHideTypeChange
      ) {
        return {
          ...prev,
          bottomState: 'TYPE_CHANGE',
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

  useEffect(() => {
    return navigation.addListener('beforeRemove', resetMainState);
  }, [navigation, resetMainState]);

  useEffect(() => {
    const f = async (): Promise<void> => {
      const warningDismissed = storage.getString(
        STORAGE_KEYS.ALWAYS_PERMISSION_NOT_GRANTED_WARNING_DISMISSED
      );
      // NOTE: フォアグラウンドも許可しない設定の場合はそもそもオートモード前提で使われていると思うので警告は不要
      const fgPermStatus = await Location.getForegroundPermissionsAsync();
      if (!fgPermStatus.granted) {
        return;
      }

      const bgPermStatus = await Location.getBackgroundPermissionsAsync();
      if (warningDismissed !== 'true' && !bgPermStatus?.granted && !isClip()) {
        showDialogWhilePresenting(
          STORAGE_KEYS.ALWAYS_PERMISSION_NOT_GRANTED_WARNING_DISMISSED,
          translate('announcementTitle'),
          translate('alwaysPermissionNotGrantedAlertText'),
          [
            {
              text: translate('doNotShowAgain'),
              style: 'checkbox',
              onPress: (): void => {
                storage.set(
                  STORAGE_KEYS.ALWAYS_PERMISSION_NOT_GRANTED_WARNING_DISMISSED,
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
                  showDialog(
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
        const dozeAlertDismissed = storage.getString(
          STORAGE_KEYS.DOZE_CONFIRMED
        );
        if (bgStatus === 'granted' && dozeAlertDismissed !== 'true') {
          showDialogWhilePresenting(
            STORAGE_KEYS.DOZE_CONFIRMED,
            translate('announcementTitle'),
            translate('dozeAlertText'),
            [
              {
                text: translate('doNotShowAgain'),
                style: 'checkbox',
                onPress: (): void => {
                  storage.set(STORAGE_KEYS.DOZE_CONFIRMED, 'true');
                },
              },
              {
                text: 'OK',
                onPress: async () => {
                  try {
                    await Linking.openSettings();
                  } catch (_error) {
                    showDialog(
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
      if (!selectedStation.id || !selectedLine?.id) {
        return;
      }

      setIsSelectBoundModalOpen(true);

      // 駅一覧と種別一覧は互いに独立したクエリなので並列で取得する
      const [{ data }, fetchedTrainTypesData] = await Promise.all([
        fetchStationsByLineId({
          variables: { lineId: selectedLine.id, stationId: selectedStation.id },
        }),
        fetchTrainTypes({
          variables: {
            stationId: selectedStation.id as number,
          },
        }),
      ]);
      const trainTypes = fetchedTrainTypesData.data?.stationTrainTypes ?? [];

      setNavigationState((prev) => ({
        ...prev,
        pendingTrainType: null,
        fetchedTrainTypes: trainTypes,
      }));
      setLineState((prev) => ({ ...prev, pendingLine: selectedLine }));
      setStationState((prev) => ({
        ...prev,
        pendingStation: selectedStation,
        pendingStations: data?.lineStations ?? [],
      }));
    },
    [
      setStationState,
      setLineState,
      fetchStationsByLineId,
      setNavigationState,
      fetchTrainTypes,
    ]
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

      const targetLine = selectedStation.line;

      showDialog(
        translate('confirmChangeLineTitle', {
          lineName:
            (isJapanese ? targetLine?.nameShort : targetLine?.nameRoman) ?? '',
        }),
        translate('confirmChangeLineText', {
          currentLineName:
            (isJapanese ? currentLine?.nameShort : currentLine?.nameRoman) ??
            '',
          lineName:
            (isJapanese ? targetLine?.nameShort : targetLine?.nameRoman) ?? '',
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
        ],
        {
          lineSymbol: targetLine
            ? {
                image: getLineSymbolImage(targetLine, false)?.signPath,
                color: targetLine.color ?? undefined,
              }
            : undefined,
        }
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

  if (pictureInPictureActive) {
    return (
      <>
        <MainScreenEffects />
        <AndroidPictureInPictureView />
      </>
    );
  }

  // ポートレートモード有効時、端末が縦向きの間はテーマ非依存の
  // 縦画面最適化レイアウトへ切り替える(横向きに戻すと通常表示)。
  if (portraitModeEnabled && windowHeight > windowWidth) {
    return (
      <>
        <MainScreenEffects />
        <PortraitMain />
        {isDevApp && devOverlayEnabled && <DevOverlay />}
      </>
    );
  }

  if (isLEDTheme) {
    return (
      <>
        <MainScreenEffects />
        <View style={landscapeKeepStyle}>
          <Header />
          <LineBoard hasTerminus={hasTerminus} />
        </View>
      </>
    );
  }

  return (
    <>
      <MainScreenEffects />
      <View style={landscapeKeepStyle}>
        <Pressable
          style={[
            StyleSheet.absoluteFill,
            theme === APP_THEME.E231 && { backgroundColor: '#E6E6E6' },
          ]}
          onPress={updateBottomState}
        >
          <Header />
          {inner}
        </Pressable>

        {isDevApp && devOverlayEnabled && <DevOverlay />}
      </View>

      <SelectBoundModal
        visible={isSelectBoundModalOpen}
        onClose={handleCloseSelectBoundModal}
        onBoundSelect={handleCloseSelectBoundModal}
        onTrainTypeSelect={handleTrainTypeSelect}
        loading={
          fetchStationsByLineGroupIdLoading ||
          fetchStationsByLineIdLoading ||
          fetchTrainTypesLoading
        }
        error={
          fetchStationsByLineGroupIdError ||
          fetchStationsByLineIdError ||
          fetchTrainTypesError ||
          null
        }
      />
    </>
  );
};

export default React.memo(MainScreen);
