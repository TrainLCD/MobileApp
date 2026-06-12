import { useActionSheet } from '@expo/react-native-action-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackActions, useNavigation } from '@react-navigation/native';
import { File } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { addScreenshotListener } from 'expo-screen-capture';
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
import reportModalVisibleAtom from '~/store/atoms/reportModal';
import tuningState from '~/store/atoms/tuning';
import { isDevApp } from '~/utils/isDevApp';
import { getSettingsThemes } from '~/utils/theme';
import {
  ALL_AVAILABLE_LANGUAGES,
  APP_STORE_URL,
  ASYNC_STORAGE_KEYS,
  AUTO_THEME_GRADIENT_COLORS,
  GOOGLE_PLAY_URL,
  IN_USE_COLOR_MAP,
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
  useWrongDirectionDetectorEffect,
} from '../hooks';
import { useTrainTypeModal } from '../hooks/useTrainTypeModal';
import { THEME_PREFERENCE, type ThemePreference } from '../models/Theme';
import { portraitModeEnabledAtom } from '../store/atoms/experimental';
import navigationState, {
  autoModeEnabledAtom,
  isAppLatestAtom,
} from '../store/atoms/navigation';
import notifyState from '../store/atoms/notify';
import { pictureInPictureAtom } from '../store/atoms/pictureInPicture';
import speechState from '../store/atoms/speech';
import { selectedBoundAtom } from '../store/atoms/station';
import { themePreferenceAtom } from '../store/atoms/theme';
import { isJapanese, translate } from '../translation';
import NewReportModal from './NewReportModal';
import { SelectBoundSettingListModal } from './SelectBoundSettingListModal';
import { ThemeListModal } from './ThemeListModal';
import { TrainTypeListModal } from './TrainTypeListModal';
import WarningPanel from './WarningPanel';

type Props = {
  children: React.ReactNode;
};

const PermittedLayout: React.FC<Props> = ({ children }: Props) => {
  const selectedBound = useAtomValue(selectedBoundAtom);
  const { untouchableModeEnabled, devOverlayEnabled } =
    useAtomValue(tuningState);
  const autoModeEnabled = useAtomValue(autoModeEnabledAtom);
  const isAppLatest = useAtomValue(isAppLatestAtom);
  const setNavigation = useSetAtom(navigationState);
  const setSpeech = useSetAtom(speechState);
  const setNotify = useSetAtom(notifyState);
  const setPictureInPicture = useSetAtom(pictureInPictureAtom);
  const setPortraitModeEnabled = useSetAtom(portraitModeEnabledAtom);
  const { active: pictureInPictureActive } = useAtomValue(pictureInPictureAtom);
  const setTuning = useSetAtom(tuningState);
  const [themePreference, setThemePreference] = useAtom(themePreferenceAtom);
  const [reportModalShow, setReportModalShow] = useAtom(reportModalVisibleAtom);
  const [sendingReport, setSendingReport] = useState(false);
  const [screenShotBase64, setScreenShotBase64] = useState('');
  const [isThemeListModalVisible, setIsThemeListModalVisible] = useState(false);
  const pendingThemeListModalRef = useRef(false);

  useCheckStoreVersion();
  useAppleWatch();
  useAndroidWearable();
  // 逆方向検知ロジックの計算を 1 箇所だけで実行し、結果は atom 経由で他のフックに配る。
  // useRefreshStation / useWarningInfo から個別に呼ぶと位置更新ごとに getDistance と
  // state 更新が二重に走ってバッテリーを余計に消費するため、ここに集約している。
  useWrongDirectionDetectorEffect();

  const user = useCachedInitAnonymousUser();
  const currentLine = useCurrentLine();
  const navigation = useNavigation();
  const { showActionSheetWithOptions } = useActionSheet();
  const { sendReport, descriptionLowerLimit } = useFeedback(user);
  const { warningInfo, clearWarningInfo } = useWarningInfo();
  const {
    isSettingListModalOpen,
    isTrainTypeModalVisible,
    trainTypeName,
    trainTypeColor,
    trainTypeSelectLoading,
    fetchTrainTypesLoading,
    trainTypeDisabled,
    trainTypeModalLine,
    openSettingListModal,
    closeSettingListModal,
    handleTrainTypePress,
    handleSettingListCloseAnimationEnd,
    closeTrainTypeModal,
    handleTrainTypeModalSelect,
  } = useTrainTypeModal();

  const viewShotRef = useRef<ViewShot>(null);

  const styles = StyleSheet.create({
    container: { width: '100%', height: '100%' },
  });

  const themeOptions = useMemo(() => getSettingsThemes(), []);

  const themeLabel = useMemo(() => {
    const found = themeOptions.find((t) => t.value === themePreference);
    return found?.label ?? translate('autoTheme');
  }, [themeOptions, themePreference]);

  const themeRowColor = useMemo(() => {
    if (themePreference === THEME_PREFERENCE.AUTO) {
      return AUTO_THEME_GRADIENT_COLORS[0];
    }
    return IN_USE_COLOR_MAP[themePreference as keyof typeof IN_USE_COLOR_MAP];
  }, [themePreference]);

  const handleThemePress = useCallback(() => {
    pendingThemeListModalRef.current = true;
    closeSettingListModal();
  }, [closeSettingListModal]);

  const handleSettingListClose = useCallback(() => {
    handleSettingListCloseAnimationEnd();
    if (pendingThemeListModalRef.current) {
      pendingThemeListModalRef.current = false;
      setIsThemeListModalVisible(true);
    }
  }, [handleSettingListCloseAnimationEnd]);

  const handleThemeListClose = useCallback(() => {
    setIsThemeListModalVisible(false);
  }, []);

  const handleThemeSelect = useCallback(
    async (preference: ThemePreference) => {
      setIsThemeListModalVisible(false);
      if (preference === themePreference) {
        return;
      }
      try {
        await AsyncStorage.setItem(
          ASYNC_STORAGE_KEYS.THEME_PREFERENCE,
          preference
        );
        setThemePreference(preference);
      } catch (err) {
        console.error(err);
        Alert.alert(
          translate('errorTitle'),
          translate('failedToSavePreference')
        );
      }
    },
    [setThemePreference, themePreference]
  );

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
      await Share.open(options).catch(console.warn);
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
        handler: openSettingListModal,
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
      openSettingListModal,
      selectedBound,
      setTuning,
      showActionSheetWithOptions,
      untouchableModeEnabled,
    ]
  );

  useEffect(() => {
    const loadSettings = async () => {
      const [
        themePreferenceKey,
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
        wrongDirectionNotifyEnabledStr,
        pictureInPictureEnabledStr,
        portraitModeEnabledStr,
      ] = await Promise.all([
        AsyncStorage.getItem(ASYNC_STORAGE_KEYS.THEME_PREFERENCE),
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
        AsyncStorage.getItem(ASYNC_STORAGE_KEYS.WRONG_DIRECTION_NOTIFY_ENABLED),
        AsyncStorage.getItem(ASYNC_STORAGE_KEYS.PICTURE_IN_PICTURE_ENABLED),
        AsyncStorage.getItem(ASYNC_STORAGE_KEYS.PORTRAIT_MODE_ENABLED),
      ]);

      if (themePreferenceKey) {
        setThemePreference(themePreferenceKey as ThemePreference);
      } else if (prevThemeKey) {
        // 既存ユーザーの移行: 明示的に選択していたテーマを維持
        setThemePreference(prevThemeKey as ThemePreference);
        await AsyncStorage.setItem(
          ASYNC_STORAGE_KEYS.THEME_PREFERENCE,
          prevThemeKey
        );
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
      if (wrongDirectionNotifyEnabledStr) {
        setNotify((prev) => ({
          ...prev,
          wrongDirectionNotifyEnabled:
            wrongDirectionNotifyEnabledStr === 'true',
        }));
      }
      if (pictureInPictureEnabledStr) {
        setPictureInPicture((prev) => ({
          ...prev,
          enabled: pictureInPictureEnabledStr === 'true',
        }));
      }
      if (portraitModeEnabledStr) {
        setPortraitModeEnabled(portraitModeEnabledStr === 'true');
      }
    };

    loadSettings();
  }, [
    setNavigation,
    setSpeech,
    setTuning,
    setThemePreference,
    setNotify,
    setPictureInPicture,
    setPortraitModeEnabled,
  ]);

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

  const handleNewReportModalClose = useCallback(() => {
    setScreenShotBase64('');
    setReportModalShow(false);
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

  const warningPanel =
    warningInfo?.text && warningInfo?.level ? (
      <WarningPanel
        behindContent={pictureInPictureActive}
        onPress={clearWarningInfo}
        text={warningInfo.text}
        warningLevel={warningInfo.level}
      />
    ) : null;

  return (
    <ViewShot ref={viewShotRef} options={{ format: 'png' }}>
      <LongPressGestureHandler
        onHandlerStateChange={onLongPress}
        minDurationMs={LONG_PRESS_DURATION}
      >
        <View style={styles.container}>
          {pictureInPictureActive && warningPanel}
          {children}
          {!pictureInPictureActive && warningPanel}
        </View>
      </LongPressGestureHandler>
      <SelectBoundSettingListModal
        visible={isSettingListModalOpen}
        onClose={closeSettingListModal}
        autoModeEnabled={autoModeEnabled}
        toggleAutoModeEnabled={toggleAutoModeEnabled}
        trainTypeName={trainTypeName}
        trainTypeColor={trainTypeColor}
        trainTypeLoading={trainTypeSelectLoading}
        onTrainTypePress={handleTrainTypePress}
        onCloseAnimationEnd={handleSettingListClose}
        trainTypeDisabled={trainTypeDisabled}
        themeLabel={themeLabel}
        themeColor={themeRowColor}
        onThemePress={handleThemePress}
      />
      <TrainTypeListModal
        visible={isTrainTypeModalVisible}
        line={trainTypeModalLine}
        loading={fetchTrainTypesLoading}
        onClose={closeTrainTypeModal}
        onSelect={handleTrainTypeModalSelect}
      />
      <ThemeListModal
        visible={isThemeListModalVisible}
        currentPreference={themePreference}
        onClose={handleThemeListClose}
        onSelect={handleThemeSelect}
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
