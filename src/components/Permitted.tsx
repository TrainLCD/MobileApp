import { useActionSheet } from '@expo/react-native-action-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackActions, useNavigation } from '@react-navigation/native';
import { Effect, pipe } from 'effect';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { addScreenshotListener } from 'expo-screen-capture';
import { useAtomValue, useSetAtom } from 'jotai';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Linking,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { LongPressGestureHandler, State } from 'react-native-gesture-handler';
import Share from 'react-native-share';
import ViewShot from 'react-native-view-shot';
import {
  useAndroidWearable,
  useAppleWatch,
  useAutoModeAlert,
  useBLEDiagnostic,
  useCachedInitAnonymousUser,
  useCheckStoreVersion,
  useCurrentLine,
  useFeedback,
  useThemeStore,
  useWarningInfo,
} from '~/hooks';
import tuningState from '~/store/atoms/tuning';
import {
  ALL_AVAILABLE_LANGUAGES,
  APP_STORE_URL,
  ASYNC_STORAGE_KEYS,
  GOOGLE_PLAY_URL,
  LONG_PRESS_DURATION,
  parenthesisRegexp,
} from '../constants';
import type { AppTheme } from '../models/Theme';
import navigationState from '../store/atoms/navigation';
import speechState from '../store/atoms/speech';
import stationState from '../store/atoms/station';
import { isJapanese, translate } from '../translation';
import { isDevApp } from '../utils/isDevApp';
import DevOverlay from './DevOverlay';
import Header from './Header';
import NewReportModal from './NewReportModal';
import WarningPanel from './WarningPanel';

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
    height: Dimensions.get('screen').height,
  },
});

type Props = {
  children: React.ReactNode;
};

const PermittedLayout: React.FC<Props> = ({ children }: Props) => {
  const { selectedBound } = useAtomValue(stationState);
  const { devOverlayEnabled, untouchableModeEnabled } =
    useAtomValue(tuningState);
  const setNavigation = useSetAtom(navigationState);
  const setSpeech = useSetAtom(speechState);
  const [reportModalShow, setReportModalShow] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);
  const [reportDescription, setReportDescription] = useState('');
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
  // 実験用
  useBLEDiagnostic();

  const handleReport = useCallback(() => {
    const captureError = (err: unknown) =>
      Effect.sync(() => {
        console.error(err);
        Alert.alert(translate('errorTitle'), String(err));
      });

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
            onPress: () => {
              Effect.runPromise(
                Effect.tryPromise({
                  try: () => Linking.openURL(appStoreUrl),
                  catch: captureError,
                })
              );
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

    pipe(
      Effect.tryPromise({
        try: viewShotCapture,
        catch: captureError,
      }),
      Effect.andThen((capturedURI) =>
        Effect.tryPromise({
          try: () =>
            FileSystem.readAsStringAsync(capturedURI, { encoding: 'base64' }),
          catch: captureError,
        })
      ),
      Effect.andThen((base64) => {
        setScreenShotBase64(base64);
        setReportModalShow(true);
      }),
      Effect.runPromise
    );
  }, [isAppLatest]);

  const handleShare = useCallback(() => {
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

    pipe(
      Effect.tryPromise({
        try: () => viewShotCapture(),
        catch: captureError,
      }),
      Effect.andThen((capturedURI) =>
        FileSystem.readAsStringAsync(capturedURI, { encoding: 'base64' })
      ),
      Effect.andThen((base64) => {
        const urlString = `data:image/jpeg;base64,${base64}`;

        const message = isJapanese
          ? `${currentLine.nameShort.replace(
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
        return Share.open(options);
      }),
      Effect.runPromise
    );
  }, [currentLine]);

  const onLongPress = useCallback(
    ({
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

      const captureError = (err: unknown) =>
        Effect.sync(() => {
          console.error(err);
          Alert.alert(translate('errorTitle'), String(err));
        });

      pipe(
        Effect.tryPromise({
          try: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
          catch: captureError,
        }),
        Effect.andThen(() => {
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
                        screen: 'SelectBound',
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
        }),
        Effect.runPromise
      );
    },
    [
      handleReport,
      handleShare,
      navigation,
      selectedBound,
      showActionSheetWithOptions,
      untouchableModeEnabled,
    ]
  );

  useEffect(() => {
    const getItemFromAsyncStorage = (key: string) =>
      Effect.tryPromise({
        try: () => AsyncStorage.getItem(key) as Promise<string | null>,
        catch: () => null,
      });

    Effect.all([
      getItemFromAsyncStorage(ASYNC_STORAGE_KEYS.PREVIOUS_THEME),
      getItemFromAsyncStorage(ASYNC_STORAGE_KEYS.ENABLED_LANGUAGES),
      getItemFromAsyncStorage(ASYNC_STORAGE_KEYS.SPEECH_ENABLED),
      getItemFromAsyncStorage(ASYNC_STORAGE_KEYS.BG_TTS_ENABLED),
      getItemFromAsyncStorage(ASYNC_STORAGE_KEYS.LEGACY_AUTO_MODE_ENABLED),
    ]).pipe(
      Effect.map(
        ([
          prevThemeKey,
          enabledLanguagesStr,
          speechEnabledStr,
          bgTTSEnabledStr,
          legacyAutoModeEnabledStr,
        ]) => {
          if (prevThemeKey) {
            useThemeStore.setState(prevThemeKey as AppTheme);
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
        }
      ),
      Effect.runPromise
    );
  }, [setNavigation, setSpeech]);

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
    setReportDescription('');
    setScreenShotBase64('');
    setReportModalShow(false);
  }, []);

  const handleReportSend = useCallback(() => {
    if (reportDescription.length < descriptionLowerLimit) {
      Alert.alert(
        translate('errorTitle'),
        translate('feedbackCharactersCountNotReached', {
          lowerLimit: descriptionLowerLimit,
        })
      );
      return;
    }

    const captureError = (err: unknown) =>
      Effect.sync(() => {
        console.error(err);
        setSendingReport(false);
        Alert.alert(translate('errorTitle'), translate('reportError'));
      });

    Alert.alert(
      translate('announcementTitle'),
      translate('reportConfirmText'),
      [
        {
          text: translate('agree'),
          style: 'destructive',
          onPress: () => {
            setSendingReport(true);
            pipe(
              Effect.tryPromise({
                try: () =>
                  sendReport({
                    reportType: 'feedback',
                    description: reportDescription.trim(),
                    screenShotBase64,
                  }),
                catch: captureError,
              }),
              Effect.andThen(() => {
                setSendingReport(false);
                Alert.alert(
                  translate('announcementTitle'),
                  translate('reportSuccessText')
                );
                handleNewReportModalClose();
              }),
              Effect.runPromise
            );
          },
        },
        {
          text: translate('disagree'),
          style: 'cancel',
        },
      ]
    );
  }, [
    descriptionLowerLimit,
    handleNewReportModalClose,
    reportDescription,
    screenShotBase64,
    sendReport,
  ]);

  // TODO: 適当なタイミングで消す
  useAutoModeAlert();

  return (
    <ViewShot ref={viewShotRef} options={{ format: 'png' }}>
      <LongPressGestureHandler
        onHandlerStateChange={onLongPress}
        minDurationMs={LONG_PRESS_DURATION}
      >
        <View style={styles.root}>
          {isDevApp && devOverlayEnabled && <DevOverlay />}
          <Header />
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
          description={reportDescription}
          onDescriptionChange={setReportDescription}
          onSubmit={handleReportSend}
          descriptionLowerLimit={descriptionLowerLimit}
        />
      </View>
    </ViewShot>
  );
};

export default React.memo(PermittedLayout);
