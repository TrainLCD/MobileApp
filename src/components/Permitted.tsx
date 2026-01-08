import { useActionSheet } from '@expo/react-native-action-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackActions, useNavigation } from '@react-navigation/native';
import { File } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { addScreenshotListener } from 'expo-screen-capture';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking, Platform, StyleSheet, View } from 'react-native';
import { LongPressGestureHandler, State } from 'react-native-gesture-handler';
import Share from 'react-native-share';
import ViewShot from 'react-native-view-shot';
import reportModalVisibleAtom from '~/store/atoms/reportModal';
import tuningState from '~/store/atoms/tuning';
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
import navigationState from '../store/atoms/navigation';
import speechState from '../store/atoms/speech';
import stationState from '../store/atoms/station';
import { themeAtom } from '../store/atoms/theme';
import { isJapanese, translate } from '../translation';
import NewReportModal from './NewReportModal';
import WarningPanel from './WarningPanel';

type Props = {
  children: React.ReactNode;
};

const PermittedLayout: React.FC<Props> = ({ children }: Props) => {
  const { selectedBound } = useAtomValue(stationState);
  const { untouchableModeEnabled } = useAtomValue(tuningState);
  const setNavigation = useSetAtom(navigationState);
  const setSpeech = useSetAtom(speechState);
  const setTuning = useSetAtom(tuningState);
  const setTheme = useSetAtom(themeAtom);
  const [reportModalShow, setReportModalShow] = useAtom(reportModalVisibleAtom);
  const [sendingReport, setSendingReport] = useState(false);
  const [screenShotBase64, setScreenShotBase64] = useState('');

  useCheckStoreVersion();
  useAppleWatch();
  useAndroidWearable();

  const user = useCachedInitAnonymousUser();
  const currentLine = useCurrentLine();
  const navigation = useNavigation();
  const { showActionSheetWithOptions } = useActionSheet();
  const { sendReport, descriptionLowerLimit } = useFeedback(user);
  const { warningInfo, clearWarningInfo } = useWarningInfo();
  const { isAppLatest } = useAtomValue(navigationState);
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
      const base64 = file.base64();
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

      const options =
        Platform.select({
          ios: [
            translate('back'),
            translate('share'),
            translate('report'),
            translate('cancel'),
          ],
          android: [
            translate('share'),
            translate('report'),
            translate('cancel'),
          ],
        }) ?? [];

      showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex: Platform.OS === 'ios' ? 0 : undefined,
          cancelButtonIndex: options.length - 1,
        },
        (buttonIndex) => {
          switch (buttonIndex) {
            // iOS: back, Android: share
            case 0:
              if (Platform.OS === 'ios') {
                navigation.dispatch(
                  StackActions.replace('MainStack', {
                    screen: 'SelectLine',
                  })
                );
                break;
              }
              handleShare();
              break;
            // iOS: share, Android: feedback
            case 1:
              if (Platform.OS === 'ios') {
                handleShare();
                break;
              }
              handleReport();
              break;
            // iOS: feedback, Android: cancel
            case 2: {
              if (Platform.OS === 'ios') {
                handleReport();
                break;
              }
              break;
            }
            // iOS: cancel, Android: will be not passed here
            case 3: {
              break;
            }
            // iOS, Android: will be not passed here
            default:
              break;
          }
        }
      );
    },
    [
      handleReport,
      handleShare,
      selectedBound,
      showActionSheetWithOptions,
      untouchableModeEnabled,
      navigation.dispatch,
    ]
  );

  useEffect(() => {
    const loadSettings = async () => {
      const [
        prevThemeKey,
        enabledLanguagesStr,
        speechEnabledStr,
        bgTTSEnabledStr,
        legacyAutoModeEnabledStr,
        telemetryEnabledStr,
      ] = await Promise.all([
        AsyncStorage.getItem(ASYNC_STORAGE_KEYS.PREVIOUS_THEME),
        AsyncStorage.getItem(ASYNC_STORAGE_KEYS.ENABLED_LANGUAGES),
        AsyncStorage.getItem(ASYNC_STORAGE_KEYS.SPEECH_ENABLED),
        AsyncStorage.getItem(ASYNC_STORAGE_KEYS.BG_TTS_ENABLED),
        AsyncStorage.getItem(ASYNC_STORAGE_KEYS.LEGACY_AUTO_MODE_ENABLED),
        AsyncStorage.getItem(ASYNC_STORAGE_KEYS.TELEMETRY_ENABLED),
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
      if (legacyAutoModeEnabledStr) {
        setNavigation((prev) => ({
          ...prev,
          enableLegacyAutoMode: legacyAutoModeEnabledStr === 'true',
        }));
      }
      if (telemetryEnabledStr) {
        setTuning((prev) => ({
          ...prev,
          telemetryEnabled: telemetryEnabledStr === 'true',
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

  const NullableWarningPanel: React.FC = useCallback(
    () =>
      warningInfo ? (
        <WarningPanel
          onPress={clearWarningInfo}
          text={warningInfo.text}
          warningLevel={warningInfo.level}
        />
      ) : null,
    [clearWarningInfo, warningInfo]
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
          <NullableWarningPanel />
        </View>
      </LongPressGestureHandler>
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
