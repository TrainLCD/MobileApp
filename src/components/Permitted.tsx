import { useLazyQuery } from '@apollo/client/react';
import { useActionSheet } from '@expo/react-native-action-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackActions, useNavigation } from '@react-navigation/native';
import { File } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { addScreenshotListener } from 'expo-screen-capture';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert, Linking, Platform, StyleSheet, View } from 'react-native';
import { LongPressGestureHandler, State } from 'react-native-gesture-handler';
import Share from 'react-native-share';
import ViewShot from 'react-native-view-shot';
import type { Station, TrainType } from '~/@types/graphql';
import { GET_LINE_GROUP_STATIONS } from '~/lib/graphql/queries';
import reportModalVisibleAtom from '~/store/atoms/reportModal';
import tuningState from '~/store/atoms/tuning';
import { findNearestStation } from '~/utils/findNearestStation';
import { isDevApp } from '~/utils/isDevApp';
import {
  ALL_AVAILABLE_LANGUAGES,
  APP_STORE_URL,
  ASYNC_STORAGE_KEYS,
  GOOGLE_PLAY_URL,
  LONG_PRESS_DURATION,
  parenthesisRegexp,
} from '../constants';
import {
  useAndroidWearable,
  useAppleWatch,
  useCachedInitAnonymousUser,
  useCheckStoreVersion,
  useCurrentLine,
  useFeedback,
  useWarningInfo,
} from '../hooks';
import type { AppTheme } from '../models/Theme';
import lineState from '../store/atoms/line';
import navigationState from '../store/atoms/navigation';
import speechState, { resetFirstSpeechAtom } from '../store/atoms/speech';
import stationState from '../store/atoms/station';
import { themeAtom } from '../store/atoms/theme';
import { isJapanese, translate } from '../translation';
import NewReportModal from './NewReportModal';
import { SelectBoundSettingListModal } from './SelectBoundSettingListModal';
import { TrainTypeListModal } from './TrainTypeListModal';
import WarningPanel from './WarningPanel';

type Props = {
  children: React.ReactNode;
};

const PermittedLayout: React.FC<Props> = ({ children }: Props) => {
  const [
    { selectedBound, station: currentStation, selectedDirection },
    setStationState,
  ] = useAtom(stationState);
  const { selectedLine } = useAtomValue(lineState);
  const { untouchableModeEnabled, devOverlayEnabled } =
    useAtomValue(tuningState);
  const [
    {
      autoModeEnabled,
      isAppLatest,
      fetchedTrainTypes,
      trainType: activeTrainType,
    },
    setNavigation,
  ] = useAtom(navigationState);
  const setSpeech = useSetAtom(speechState);
  const setResetFirstSpeech = useSetAtom(resetFirstSpeechAtom);
  const setTuning = useSetAtom(tuningState);
  const setTheme = useSetAtom(themeAtom);
  const [reportModalShow, setReportModalShow] = useAtom(reportModalVisibleAtom);
  const [sendingReport, setSendingReport] = useState(false);
  const [screenShotBase64, setScreenShotBase64] = useState('');
  const [isSettingListModalOpen, setIsSettingListModalOpen] = useState(false);
  const [isTrainTypeModalVisible, setIsTrainTypeModalVisible] = useState(false);
  const pendingTrainTypeModalRef = useRef(false);

  useCheckStoreVersion();
  useAppleWatch();
  useAndroidWearable();

  const user = useCachedInitAnonymousUser();
  const currentLine = useCurrentLine();
  const navigation = useNavigation();
  const { showActionSheetWithOptions } = useActionSheet();
  const { sendReport, descriptionLowerLimit } = useFeedback(user);
  const { warningInfo, clearWarningInfo } = useWarningInfo();
  const [fetchStationsByLineGroupId, { loading: trainTypeSelectLoading }] =
    useLazyQuery<{ lineGroupStations: Station[] }, { lineGroupId: number }>(
      GET_LINE_GROUP_STATIONS
    );

  const viewShotRef = useRef<ViewShot>(null);

  const styles = StyleSheet.create({
    container: { width: '100%', height: '100%' },
  });

  const handleReport = useCallback(async () => {
    const captureError = (err: unknown) => {
      console.error(err);
      Alert.alert(translate('errorTitle'), String(err));
    };

    if (!isAppLatest) {
      const appStoreUrl = Platform.select({
        ios: APP_STORE_URL,
        android: GOOGLE_PLAY_URL,
      });

      if (!appStoreUrl) {
        return;
      }

      Alert.alert(
        translate('announcementTitle'),
        translate('updateRequiredForReport'),
        [
          {
            text: translate('updateApp'),
            style: 'destructive',
            onPress: async () => {
              try {
                await Linking.openURL(appStoreUrl);
              } catch (err) {
                captureError(err);
              }
            },
          },
          {
            text: translate('cancel'),
            style: 'cancel',
          },
        ]
      );
      return;
    }

    const viewShotCapture = viewShotRef.current?.capture;
    if (!viewShotCapture) {
      return;
    }

    try {
      const capturedURI = await viewShotCapture();
      const file = new File(capturedURI);
      const base64 = await file.base64();
      setScreenShotBase64(base64);
      setReportModalShow(true);
      await ScreenOrientation.unlockAsync();
    } catch (err) {
      captureError(err);
    }
  }, [isAppLatest, setReportModalShow]);

  const handleShare = useCallback(async () => {
    const captureError = (err: unknown) => {
      console.error(err);
      if (err instanceof Error && err.message === 'User did not share') {
        return;
      }
      Alert.alert(`${translate('couldntShare')} ${err}`);
    };

    const viewShotCapture = viewShotRef.current?.capture;
    if (!viewShotCapture || !currentLine) {
      return;
    }

    try {
      const capturedURI = await viewShotCapture();
      const file = new File(capturedURI);
      const base64 = await file.base64();
      const urlString = `data:image/jpeg;base64,${base64}`;

      const message = isJapanese
        ? `${currentLine.nameShort?.replace(
            parenthesisRegexp,
            ''
          )}で移動中です！ #TrainLCD https://trainlcd.app`
        : `I'm riding ${currentLine.nameRoman?.replace(
            parenthesisRegexp,
            ''
          )} with #TrainLCD https://trainlcd.app`;
      const options = {
        title: 'TrainLCD',
        message,
        url: urlString,
        type: 'image/png',
      };
      await ScreenOrientation.unlockAsync().catch(console.error);
      await Share.open(options).catch(console.warn);
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE
      ).catch(console.error);
    } catch (err) {
      captureError(err);
    }
  }, [currentLine]);

  const onLongPress = useCallback(
    async ({
      nativeEvent,
    }: {
      nativeEvent: {
        state: State;
      };
    }) => {
      if (
        !selectedBound ||
        nativeEvent.state !== State.ACTIVE ||
        untouchableModeEnabled
      ) {
        return;
      }

      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (err) {
        console.error(err);
        Alert.alert(translate('errorTitle'), String(err));
        return;
      }

      const actions =
        Platform.select({
          ios: [
            {
              label: translate('back'),
              handler: () => {
                navigation.dispatch(
                  StackActions.replace('MainStack', {
                    screen: 'SelectLine',
                  })
                );
              },
            },
            {
              label: translate('share'),
              handler: handleShare,
            },
            {
              label: translate('report'),
              handler: handleReport,
            },
          ],
          android: [
            {
              label: translate('share'),
              handler: handleShare,
            },
            {
              label: translate('report'),
              handler: handleReport,
            },
          ],
        }) ?? [];

      actions.push({
        label: translate('settings'),
        handler: () => {
          setIsSettingListModalOpen(true);
        },
      });

      if (isDevApp) {
        actions.push({
          label: translate(
            devOverlayEnabled ? 'hideDevOverlay' : 'showDevOverlay'
          ),
          handler: async () => {
            const prevValue = devOverlayEnabled;
            const nextValue = !devOverlayEnabled;
            setTuning((prev) => ({
              ...prev,
              devOverlayEnabled: nextValue,
            }));
            try {
              await AsyncStorage.setItem(
                ASYNC_STORAGE_KEYS.DEV_OVERLAY_ENABLED,
                String(nextValue)
              );
            } catch (error) {
              console.error(error);
              setTuning((prev) => ({
                ...prev,
                devOverlayEnabled: prevValue,
              }));
              Alert.alert(
                translate('errorTitle'),
                translate('failedToSavePreference')
              );
            }
          },
        });
      }

      const options = [
        ...actions.map((action) => action.label),
        translate('cancel'),
      ];

      showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex: Platform.OS === 'ios' ? 0 : undefined,
          cancelButtonIndex: options.length - 1,
        },
        (buttonIndex) => {
          if (buttonIndex == null || buttonIndex >= actions.length) {
            return;
          }
          void actions[buttonIndex]?.handler();
        }
      );
    },
    [
      devOverlayEnabled,
      handleReport,
      handleShare,
      navigation,
      selectedBound,
      setTuning,
      showActionSheetWithOptions,
      untouchableModeEnabled,
    ]
  );

  useEffect(() => {
    const loadSettings = async () => {
      const [
        prevThemeKey,
        enabledLanguagesStr,
        speechEnabledStr,
        bgTTSEnabledStr,
        ttsEnabledLanguagesStr,
        telemetryEnabledStr,
        devOverlayEnabledStr,
        headerTransitionIntervalStr,
        headerTransitionDelayStr,
        bottomTransitionIntervalStr,
        untouchableModeEnabledStr,
      ] = await Promise.all([
        AsyncStorage.getItem(ASYNC_STORAGE_KEYS.PREVIOUS_THEME),
        AsyncStorage.getItem(ASYNC_STORAGE_KEYS.ENABLED_LANGUAGES),
        AsyncStorage.getItem(ASYNC_STORAGE_KEYS.SPEECH_ENABLED),
        AsyncStorage.getItem(ASYNC_STORAGE_KEYS.BG_TTS_ENABLED),
        AsyncStorage.getItem(ASYNC_STORAGE_KEYS.TTS_ENABLED_LANGUAGES),
        AsyncStorage.getItem(ASYNC_STORAGE_KEYS.TELEMETRY_ENABLED),
        AsyncStorage.getItem(ASYNC_STORAGE_KEYS.DEV_OVERLAY_ENABLED),
        AsyncStorage.getItem(ASYNC_STORAGE_KEYS.HEADER_TRANSITION_INTERVAL),
        AsyncStorage.getItem(ASYNC_STORAGE_KEYS.HEADER_TRANSITION_DELAY),
        AsyncStorage.getItem(ASYNC_STORAGE_KEYS.BOTTOM_TRANSITION_INTERVAL),
        AsyncStorage.getItem(ASYNC_STORAGE_KEYS.UNTOUCHABLE_MODE_ENABLED),
      ]);

      if (prevThemeKey) {
        setTheme(prevThemeKey as AppTheme);
      }
      if (enabledLanguagesStr) {
        setNavigation((prev) => ({
          ...prev,
          enabledLanguages:
            JSON.parse(enabledLanguagesStr) || ALL_AVAILABLE_LANGUAGES,
        }));
      }
      if (speechEnabledStr) {
        setSpeech((prev) => ({
          ...prev,
          enabled: speechEnabledStr === 'true',
        }));
      }
      if (bgTTSEnabledStr) {
        setSpeech((prev) => ({
          ...prev,
          backgroundEnabled: bgTTSEnabledStr === 'true',
        }));
      }
      if (ttsEnabledLanguagesStr) {
        try {
          const parsedLanguages = JSON.parse(ttsEnabledLanguagesStr) as Array<
            'JA' | 'EN'
          >;
          const hasJapanese = parsedLanguages.includes('JA');
          const hasEnglish = parsedLanguages.includes('EN');
          if (hasJapanese || hasEnglish) {
            const normalizedLanguages = [
              ...(hasJapanese ? (['JA'] as const) : []),
              ...(hasEnglish ? (['EN'] as const) : []),
            ];
            setSpeech((prev) => ({
              ...prev,
              ttsEnabledLanguages: normalizedLanguages,
            }));
          }
        } catch (error) {
          console.error('Failed to parse TTS enabled languages:', error);
        }
      }
      if (telemetryEnabledStr) {
        setTuning((prev) => ({
          ...prev,
          telemetryEnabled: telemetryEnabledStr === 'true',
        }));
      }
      if (devOverlayEnabledStr) {
        setTuning((prev) => ({
          ...prev,
          devOverlayEnabled: devOverlayEnabledStr === 'true',
        }));
      }
      if (headerTransitionIntervalStr) {
        const parsed = Number(headerTransitionIntervalStr);
        if (!Number.isNaN(parsed)) {
          setTuning((prev) => ({
            ...prev,
            headerTransitionInterval: parsed,
          }));
        }
      }
      if (headerTransitionDelayStr) {
        const parsed = Number(headerTransitionDelayStr);
        if (!Number.isNaN(parsed)) {
          setTuning((prev) => ({
            ...prev,
            headerTransitionDelay: parsed,
          }));
        }
      }
      if (bottomTransitionIntervalStr) {
        const parsed = Number(bottomTransitionIntervalStr);
        if (!Number.isNaN(parsed)) {
          setTuning((prev) => ({
            ...prev,
            bottomTransitionInterval: parsed,
          }));
        }
      }
      if (untouchableModeEnabledStr) {
        setTuning((prev) => ({
          ...prev,
          untouchableModeEnabled: untouchableModeEnabledStr === 'true',
        }));
      }
    };

    loadSettings();
  }, [setNavigation, setSpeech, setTuning, setTheme]);

  useEffect(() => {
    const { remove } = addScreenshotListener(() => {
      if (selectedBound) {
        clearWarningInfo();
      }
    });

    return remove;
  }, [clearWarningInfo, selectedBound]);

  const toggleAutoModeEnabled = useCallback(() => {
    setNavigation((prev) => ({
      ...prev,
      autoModeEnabled: !prev.autoModeEnabled,
    }));
  }, [setNavigation]);

  const trainTypeName = useMemo(
    () =>
      activeTrainType
        ? isJapanese
          ? (activeTrainType.name ?? '')
          : (activeTrainType.nameRoman ?? '')
        : undefined,
    [activeTrainType]
  );

  const handleTrainTypeSelect = useCallback(
    async (trainType: TrainType) => {
      if (trainType.groupId == null) return;
      const res = await fetchStationsByLineGroupId({
        variables: { lineGroupId: trainType.groupId },
      });
      const newStations = res.data?.lineGroupStations ?? [];

      if (selectedBound) {
        // Main画面で動作中: アクティブなstateを直接更新
        const currentInNewList = newStations.some(
          (s) => s.groupId === currentStation?.groupId
        );

        setStationState((prev) => {
          if (currentInNewList) {
            return { ...prev, stations: newStations };
          }

          const nearest = findNearestStation(
            prev.stations,
            newStations,
            currentStation?.groupId,
            selectedDirection
          );

          return {
            ...prev,
            stations: newStations,
            ...(nearest ? { station: nearest } : {}),
          };
        });

        setNavigation((prev) => ({
          ...prev,
          trainType,
          leftStations: [],
        }));
        setResetFirstSpeech((prev) => !prev);
      } else {
        // 方面選択前: pendingに保持
        setStationState((prev) => ({
          ...prev,
          pendingStations: newStations,
        }));
        setNavigation((prev) => ({
          ...prev,
          pendingTrainType: trainType,
        }));
      }
    },
    [
      fetchStationsByLineGroupId,
      setStationState,
      setNavigation,
      setResetFirstSpeech,
      selectedBound,
      currentStation?.groupId,
      selectedDirection,
    ]
  );

  const handleNewReportModalClose = useCallback(() => {
    setScreenShotBase64('');
    setReportModalShow(false);

    ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.LANDSCAPE
    ).catch(console.error);
  }, [setReportModalShow]);

  const handleReportSend = useCallback(
    (description: string) => {
      if (description.trim().length < descriptionLowerLimit) {
        Alert.alert(
          translate('errorTitle'),
          translate('feedbackCharactersCountNotReached', {
            lowerLimit: descriptionLowerLimit,
          })
        );
        return;
      }

      Alert.alert(
        translate('announcementTitle'),
        translate('reportConfirmText'),
        [
          {
            text: translate('agree'),
            style: 'destructive',
            onPress: async () => {
              setSendingReport(true);
              try {
                await sendReport({
                  reportType: 'feedback',
                  description: description.trim(),
                  screenShotBase64,
                });
                setSendingReport(false);
                Alert.alert(
                  translate('announcementTitle'),
                  translate('reportSuccessText')
                );
                handleNewReportModalClose();
              } catch (err) {
                console.error(err);
                setSendingReport(false);
                Alert.alert(translate('errorTitle'), translate('reportError'));
              }
            },
          },
          {
            text: translate('disagree'),
            style: 'cancel',
          },
        ]
      );
    },
    [
      descriptionLowerLimit,
      handleNewReportModalClose,
      screenShotBase64,
      sendReport,
    ]
  );

  return (
    <ViewShot ref={viewShotRef} options={{ format: 'png' }}>
      <LongPressGestureHandler
        onHandlerStateChange={onLongPress}
        minDurationMs={LONG_PRESS_DURATION}
      >
        <View style={styles.container}>
          {children}
          {warningInfo?.text && warningInfo?.level && (
            <WarningPanel
              onPress={clearWarningInfo}
              text={warningInfo.text}
              warningLevel={warningInfo.level}
            />
          )}
        </View>
      </LongPressGestureHandler>
      <SelectBoundSettingListModal
        visible={isSettingListModalOpen}
        onClose={() => setIsSettingListModalOpen(false)}
        autoModeEnabled={autoModeEnabled}
        toggleAutoModeEnabled={toggleAutoModeEnabled}
        trainTypeName={trainTypeName}
        trainTypeColor={activeTrainType?.color ?? undefined}
        trainTypeLoading={trainTypeSelectLoading}
        onTrainTypePress={() => {
          pendingTrainTypeModalRef.current = true;
          setIsSettingListModalOpen(false);
        }}
        onCloseAnimationEnd={() => {
          if (pendingTrainTypeModalRef.current) {
            pendingTrainTypeModalRef.current = false;
            setIsTrainTypeModalVisible(true);
          }
        }}
        trainTypeDisabled={!fetchedTrainTypes.length}
      />
      <TrainTypeListModal
        visible={isTrainTypeModalVisible}
        line={selectedLine ?? currentLine}
        onClose={() => setIsTrainTypeModalVisible(false)}
        onSelect={(trainType) => {
          setIsTrainTypeModalVisible(false);
          handleTrainTypeSelect(trainType);
        }}
      />
      {/* NOTE: このViewを外すとフィードバックモーダルのレイアウトが崩御する */}
      <View>
        <NewReportModal
          visible={reportModalShow}
          sending={sendingReport}
          onClose={handleNewReportModalClose}
          onSubmit={handleReportSend}
          descriptionLowerLimit={descriptionLowerLimit}
        />
      </View>
    </ViewShot>
  );
};

export default React.memo(PermittedLayout);
