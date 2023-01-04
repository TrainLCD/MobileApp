import { useActionSheet } from '@expo/react-native-action-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { LocationObject } from 'expo-location';
import { addScreenshotListener } from 'expo-screen-capture';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert, Dimensions, Platform, StyleSheet, View } from 'react-native';
import RNFS from 'react-native-fs';
import { LongPressGestureHandler, State } from 'react-native-gesture-handler';
import Share from 'react-native-share';
import ViewShot from 'react-native-view-shot';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { ASYNC_STORAGE_KEYS } from '../constants/asyncStorageKeys';
import { ALL_AVAILABLE_LANGUAGES } from '../constants/languages';
import { parenthesisRegexp } from '../constants/regexp';
import useAppleWatch from '../hooks/useAppleWatch';
import useCheckStoreVersion from '../hooks/useCheckStoreVersion';
import useConnectivity from '../hooks/useConnectivity';
import useCurrentLine from '../hooks/useCurrentLine';
import useDetectBadAccuracy from '../hooks/useDetectBadAccuracy';
import useDevToken from '../hooks/useDevToken';
import useFeedback from '../hooks/useFeedback';
import useIsNextLastStop from '../hooks/useIsNextLastStop';
import useNextStation from '../hooks/useNextStation';
import useResetMainState from '../hooks/useResetMainState';
import useUpdateLiveActivities from '../hooks/useUpdateLiveActivities';
import { AppTheme, APP_THEME } from '../models/Theme';
import devState from '../store/atoms/dev';
import locationState from '../store/atoms/location';
import mirroringShareState from '../store/atoms/mirroringShare';
import navigationState from '../store/atoms/navigation';
import speechState from '../store/atoms/speech';
import stationState from '../store/atoms/station';
import themeState from '../store/atoms/theme';
import { isJapanese, translate } from '../translation';
import getIsPass from '../utils/isPass';
import DevOverlay from './DevOverlay';
import Header from './Header';
import MirroringShareModal from './MirroringShareModal';
import NewReportModal from './NewReportModal';
import WarningPanel from './WarningPanel';

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
    backgroundColor: '#fff',
    height: Dimensions.get('window').height,
  },
});

type Props = {
  children: React.ReactNode;
};

const WARNING_PANEL_LEVEL = {
  URGENT: 'URGENT',
  WARNING: 'WARNING',
  INFO: 'INFO',
} as const;

export type WarningPanelLevel =
  typeof WARNING_PANEL_LEVEL[keyof typeof WARNING_PANEL_LEVEL];

const PermittedLayout: React.FC<Props> = ({ children }: Props) => {
  const [warningDismissed, setWarningDismissed] = useState(false);
  const [warningInfo, setWarningInfo] = useState<{
    level: WarningPanelLevel;
    text: string;
  } | null>(null);
  const [msFeatureModalShow, setMsFeatureModalShow] = useState(false);

  const { station, stations, selectedBound } = useRecoilValue(stationState);
  const { location, badAccuracy } = useRecoilValue(locationState);
  const setTheme = useSetRecoilState(themeState);
  const [{ autoModeEnabled, requiredPermissionGranted }, setNavigation] =
    useRecoilState(navigationState);
  const [{ devMode }, setDevMode] = useRecoilState(devState);
  const setSpeech = useSetRecoilState(speechState);
  const [reportModalShow, setReportModalShow] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);
  const [reportDescription, setReportDescription] = useState('');
  const [screenShotBase64, setScreenShotBase64] = useState('');
  const { subscribing } = useRecoilValue(mirroringShareState);

  useCheckStoreVersion();
  useDetectBadAccuracy();
  useAppleWatch();
  useUpdateLiveActivities();
  useDevToken(true);

  const nextStation = useNextStation();
  const currentLine = useCurrentLine();

  const resetStateAndUnsubscribeMS = useResetMainState();
  const navigation = useNavigation();
  const isInternetAvailable = useConnectivity();
  const { showActionSheetWithOptions } = useActionSheet();
  const { getEligibility, sendReport } = useFeedback({
    description: reportDescription.trim(),
    screenShotBase64,
  });
  const isLast = useIsNextLastStop();

  const viewShotRef = useRef<ViewShot>(null);

  const stationWithNumber = useMemo(
    () =>
      stations
        .filter((s) => !getIsPass(s))
        .find(
          (s) =>
            s.groupId === station?.groupId &&
            currentLine?.id === s.currentLine?.id
        ),
    [currentLine?.id, stations, station?.groupId]
  );

  useEffect(() => {
    const f = async (): Promise<void> => {
      const firstLaunchPassed = await AsyncStorage.getItem(
        ASYNC_STORAGE_KEYS.FIRST_LAUNCH_PASSED
      );
      if (firstLaunchPassed === null) {
        Alert.alert(translate('notice'), translate('firstAlertText'), [
          {
            text: 'OK',
            onPress: (): void => {
              AsyncStorage.setItem(
                ASYNC_STORAGE_KEYS.FIRST_LAUNCH_PASSED,
                'true'
              );
            },
          },
        ]);
      }
    };
    f();
  }, []);

  useEffect(() => {
    const loadSettingsAsync = async () => {
      const prevThemeStr = await AsyncStorage.getItem(
        ASYNC_STORAGE_KEYS.PREVIOUS_THEME
      );

      if (prevThemeStr) {
        const legacyThemeId = parseInt(prevThemeStr, 10);
        const hasLegacyThemeId = !Number.isNaN(legacyThemeId);
        const currentTheme = hasLegacyThemeId
          ? Object.values(APP_THEME)[legacyThemeId]
          : (prevThemeStr as AppTheme);
        setTheme((prev) => ({
          ...prev,
          theme: currentTheme || APP_THEME.TOKYO_METRO,
        }));
        if (hasLegacyThemeId) {
          await AsyncStorage.setItem(
            ASYNC_STORAGE_KEYS.PREVIOUS_THEME,
            currentTheme
          );
        }
      }
      const isDevModeEnabled =
        (await AsyncStorage.getItem(ASYNC_STORAGE_KEYS.DEV_MODE_ENABLED)) ===
        'true';

      if (isDevModeEnabled) {
        const token = await AsyncStorage.getItem(
          ASYNC_STORAGE_KEYS.DEV_MODE_TOKEN
        );
        setDevMode((prev) => ({
          ...prev,
          devMode: isDevModeEnabled,
          token,
        }));
      }
      const enabledLanguagesStr = await AsyncStorage.getItem(
        ASYNC_STORAGE_KEYS.ENABLED_LANGUAGES
      );
      if (enabledLanguagesStr) {
        setNavigation((prev) => ({
          ...prev,
          enabledLanguages:
            JSON.parse(enabledLanguagesStr) || ALL_AVAILABLE_LANGUAGES,
        }));
      }
      const speechEnabledStr = await AsyncStorage.getItem(
        ASYNC_STORAGE_KEYS.SPEECH_ENABLED
      );
      setSpeech((prev) => ({
        ...prev,
        enabled: speechEnabledStr === 'true',
      }));
    };
    loadSettingsAsync();
  }, [setTheme, setSpeech, setNavigation, setDevMode]);

  useEffect(() => {
    if (autoModeEnabled) {
      setWarningDismissed(false);
    }
  }, [autoModeEnabled]);

  useEffect(() => {
    if (subscribing) {
      setWarningDismissed(false);
    }
  }, [subscribing]);

  useEffect(() => {
    if (!isInternetAvailable) {
      setWarningDismissed(false);
    }
  }, [isInternetAvailable]);

  const getWarningInfo = useCallback(() => {
    if (warningDismissed) {
      return null;
    }

    if (subscribing) {
      return {
        level: WARNING_PANEL_LEVEL.INFO,
        text: translate('subscribedNotice'),
      };
    }

    if (autoModeEnabled) {
      return {
        level: WARNING_PANEL_LEVEL.INFO,
        text: translate('autoModeInProgress'),
      };
    }

    if (!isInternetAvailable && selectedBound) {
      return {
        level: WARNING_PANEL_LEVEL.WARNING,
        text: translate('offlineWarningText'),
      };
    }

    if (!requiredPermissionGranted && selectedBound) {
      return {
        level: WARNING_PANEL_LEVEL.WARNING,
        text: translate('permissionsNotGranted'),
      };
    }

    if (badAccuracy) {
      return {
        level: WARNING_PANEL_LEVEL.URGENT,
        text: translate('badAccuracy'),
      };
    }
    return null;
  }, [
    autoModeEnabled,
    badAccuracy,
    isInternetAvailable,
    requiredPermissionGranted,
    selectedBound,
    subscribing,
    warningDismissed,
  ]);

  useEffect(() => {
    const info = getWarningInfo();
    setWarningInfo(info);
  }, [getWarningInfo]);

  useEffect(() => {
    const subscripiton = addScreenshotListener(() => {
      if (selectedBound) {
        setWarningInfo({
          level: WARNING_PANEL_LEVEL.INFO,
          text: translate('shareNotice'),
        });
      }
    });

    return subscripiton.remove;
  }, [selectedBound]);

  const onWarningPress = (): void => setWarningDismissed(true);

  const NullableWarningPanel: React.FC = () =>
    warningInfo ? (
      <WarningPanel
        onPress={onWarningPress}
        text={warningInfo.text}
        warningLevel={warningInfo.level}
      />
    ) : null;

  const handleShare = useCallback(async () => {
    if (!viewShotRef || !currentLine) {
      return;
    }
    try {
      if (!viewShotRef.current?.capture || !currentLine) {
        return;
      }

      const uri = await viewShotRef.current.capture();
      const res = await RNFS.readFile(uri, 'base64');
      const urlString = `data:image/jpeg;base64,${res}`;
      const message = isJapanese
        ? `${currentLine.name.replace(
            parenthesisRegexp,
            ''
          )}で移動中です！ #TrainLCD https://trainlcd.app`
        : `I'm riding ${currentLine.nameR.replace(
            parenthesisRegexp,
            ''
          )} with #TrainLCD https://trainlcd.app`;
      const options = {
        title: 'TrainLCD',
        message,
        url: urlString,
        type: 'image/png',
      };
      await Share.open(options);
    } catch (err) {
      if ((err as { message: string }).message !== 'User did not share') {
        Alert.alert(translate('couldntShare'));
      }
    }
  }, [currentLine]);

  const handleMirroringShare = () => {
    if (subscribing) {
      Alert.alert(translate('errorTitle'), translate('publishProhibited'));
    } else {
      setMsFeatureModalShow(true);
    }
  };
  const handleMirroringShareModalClose = () => setMsFeatureModalShow(false);

  const handleReport = async () => {
    if (!viewShotRef.current?.capture || devMode) {
      return;
    }

    try {
      const eligibleType = await getEligibility();

      switch (eligibleType) {
        case 'banned':
          Alert.alert(translate('errorTitle'), translate('feedbackBanned'));
          return;
        case 'limitExceeded':
          Alert.alert(
            translate('annoucementTitle'),
            translate('feedbackSendLimitExceeded')
          );
          return;
        default:
          break;
      }

      const uri = await viewShotRef.current.capture();
      setScreenShotBase64(await RNFS.readFile(uri, 'base64'));

      setReportModalShow(true);
    } catch (err) {
      Alert.alert(translate('errorTitle'), translate('reportError'));
    }
  };

  const onLongPress = async ({
    nativeEvent,
  }: {
    nativeEvent: {
      state: State;
    };
  }): Promise<void> => {
    if (!selectedBound) {
      return;
    }

    if (nativeEvent.state === State.ACTIVE) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const buttons = Platform.select({
        ios: [
          translate('back'),
          translate('share'),
          devMode ? translate('msFeatureTitle') : translate('report'),
          translate('cancel'),
        ],
        android: [
          translate('share'),
          devMode ? translate('msFeatureTitle') : translate('report'),
          translate('cancel'),
        ],
      });

      showActionSheetWithOptions(
        {
          options: buttons || [],
          destructiveButtonIndex: Platform.OS === 'ios' ? 0 : undefined,
          cancelButtonIndex: (buttons || []).length - 1,
        },
        (buttonIndex) => {
          switch (buttonIndex) {
            // iOS: back, Android: share
            case 0:
              if (Platform.OS === 'ios') {
                resetStateAndUnsubscribeMS();
                navigation.navigate('SelectBound');
                break;
              }
              handleShare();
              break;
            // iOS: share, Android: mirroring share or feedback
            case 1:
              if (Platform.OS === 'ios') {
                handleShare();
                break;
              }
              if (devMode) {
                handleMirroringShare();
                break;
              }
              handleReport();
              break;
            // iOS: mirroring share or feedback, Android: Feedback
            case 2: {
              if (Platform.OS === 'ios') {
                if (devMode) {
                  handleMirroringShare();
                  break;
                }
                handleReport();
                break;
              }
              handleReport();
              break;
            }
            // iOS: cancel
            case 3: {
              break;
            }
            // iOS, Android: will be not passed here
            default:
              break;
          }
        }
      );
    }
  };

  const handleNewReportModalClose = () => {
    setReportDescription('');
    setScreenShotBase64('');
    setReportModalShow(false);
  };

  const handleReportSend = () => {
    if (!reportDescription.length) {
      return;
    }

    Alert.alert(translate('annoucementTitle'), translate('reportConfirmText'), [
      {
        text: translate('agree'),
        style: 'destructive',
        onPress: async () => {
          try {
            setSendingReport(true);
            await sendReport();
            setSendingReport(false);
            Alert.alert(
              translate('annoucementTitle'),
              translate('reportSuccessText')
            );
            handleNewReportModalClose();
          } catch (err) {
            setSendingReport(false);
            Alert.alert(translate('errorTitle'), translate('reportError'));
          }
        },
      },
      {
        text: translate('disagree'),
        style: 'cancel',
      },
    ]);
  };

  return (
    <ViewShot ref={viewShotRef} options={{ format: 'png' }}>
      <LongPressGestureHandler
        onHandlerStateChange={onLongPress}
        minDurationMs={500}
      >
        <View style={styles.root}>
          {/* eslint-disable-next-line no-undef */}
          {devMode && station && location && (
            <DevOverlay location={location as LocationObject} />
          )}
          {station && (
            <Header
              station={stationWithNumber || station}
              nextStation={nextStation}
              isLast={isLast}
            />
          )}
          {children}
          <NullableWarningPanel />
        </View>
      </LongPressGestureHandler>
      {!subscribing ? (
        <MirroringShareModal
          visible={msFeatureModalShow}
          onClose={handleMirroringShareModalClose}
        />
      ) : null}
      <NewReportModal
        visible={reportModalShow}
        sending={sendingReport}
        onClose={handleNewReportModalClose}
        description={reportDescription}
        onDescriptionChange={setReportDescription}
        onSubmit={handleReportSend}
      />
    </ViewShot>
  );
};

export default React.memo(PermittedLayout);
