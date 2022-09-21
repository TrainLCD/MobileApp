import { useActionSheet } from '@expo/react-native-action-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
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
import AsyncStorageKeys from '../constants/asyncStorageKeys';
import { ALL_AVAILABLE_LANGUAGES } from '../constants/languages';
import { parenthesisRegexp } from '../constants/regexp';
import useAppleWatch from '../hooks/useAppleWatch';
import useCheckStoreVersion from '../hooks/useCheckStoreVersion';
import useConnectivity from '../hooks/useConnectivity';
import useCurrentLine from '../hooks/useCurrentLine';
import useDetectBadAccuracy from '../hooks/useDetectBadAccuracy';
import useLiveActivities from '../hooks/useLiveActivities';
import useResetMainState from '../hooks/useResetMainState';
import useTTSProvider from '../hooks/useTTSProvider';
import AppTheme from '../models/Theme';
import changeAppIcon from '../nativeUtils/customIconModule';
import devState from '../store/atoms/dev';
import locationState from '../store/atoms/location';
import mirroringShareState from '../store/atoms/mirroringShare';
import navigationState from '../store/atoms/navigation';
import speechState from '../store/atoms/speech';
import stationState from '../store/atoms/station';
import themeState from '../store/atoms/theme';
import { isJapanese, translate } from '../translation';
import getIsPass from '../utils/isPass';
import { getIsLoopLine } from '../utils/loopLine';
import DevOverlay from './DevOverlay';
import Header from './Header';
import useNextStation from './useNextStation';
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

const PermittedLayout: React.FC<Props> = ({ children }: Props) => {
  const [warningDismissed, setWarningDismissed] = useState(false);
  const [warningInfo, setWarningInfo] = useState<{
    level: 'URGENT' | 'WARNING' | 'INFO';
    text: string;
  } | null>(null);

  const { station, stations, rawStations, selectedDirection, selectedBound } =
    useRecoilValue(stationState);
  const { location, badAccuracy } = useRecoilValue(locationState);
  const setTheme = useSetRecoilState(themeState);
  const [{ trainType, autoModeEnabled }, setNavigation] =
    useRecoilState(navigationState);
  const [{ devMode }, setDevMode] = useRecoilState(devState);
  const setSpeech = useSetRecoilState(speechState);
  const isAppIconChecked = useRef(false);

  const currentLine = useCurrentLine();

  const { subscribing } = useRecoilValue(mirroringShareState);

  const stationWithNumber = rawStations
    .filter((s) => !getIsPass(s))
    .find(
      (s) =>
        s.groupId === station?.groupId && currentLine?.id === s.currentLine?.id
    );

  const viewShotRef = useRef<ViewShot>(null);

  useDetectBadAccuracy();
  useAppleWatch();
  useTTSProvider();
  useCheckStoreVersion();
  useLiveActivities();

  const handleBackButtonPress = useResetMainState();

  useEffect(() => {
    const changeAppIconAsync = async () => {
      if (!isAppIconChecked.current && devMode) {
        await changeAppIcon('AppIconDev');
      }
    };
    changeAppIconAsync();
    isAppIconChecked.current = true;
  }, [devMode]);

  useEffect(() => {
    const f = async (): Promise<void> => {
      const firstLaunchPassed = await AsyncStorage.getItem(
        AsyncStorageKeys.FirstLaunchPassed
      );
      if (firstLaunchPassed === null) {
        Alert.alert(translate('notice'), translate('firstAlertText'), [
          {
            text: 'OK',
            onPress: (): void => {
              AsyncStorage.setItem(AsyncStorageKeys.FirstLaunchPassed, 'true');
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
        AsyncStorageKeys.PreviousTheme
      );

      if (prevThemeStr) {
        setTheme((prev) => ({
          ...prev,
          theme: parseInt(prevThemeStr, 10) || AppTheme.TokyoMetro,
        }));
      }
      const isDevModeEnabled =
        (await AsyncStorage.getItem(AsyncStorageKeys.DevModeEnabled)) ===
        'true';

      if (isDevModeEnabled) {
        setDevMode((prev) => ({
          ...prev,
          devMode: isDevModeEnabled,
        }));
        changeAppIcon('AppIconDev');
      }
      const enabledLanguagesStr = await AsyncStorage.getItem(
        AsyncStorageKeys.EnabledLanguages
      );
      if (enabledLanguagesStr) {
        setNavigation((prev) => ({
          ...prev,
          enabledLanguages:
            JSON.parse(enabledLanguagesStr) || ALL_AVAILABLE_LANGUAGES,
        }));
      }
      const speechEnabledStr = await AsyncStorage.getItem(
        AsyncStorageKeys.SpeechEnabled
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

  const isInternetAvailable = useConnectivity();

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
        level: 'INFO' as const,
        text: translate('subscribedNotice'),
      };
    }

    if (autoModeEnabled) {
      return {
        level: 'INFO' as const,
        text: translate('autoModeInProgress'),
      };
    }

    if (!isInternetAvailable && station) {
      return {
        level: 'WARNING' as const,
        text: translate('offlineWarningText'),
      };
    }

    if (badAccuracy) {
      return {
        level: 'URGENT' as const,
        text: translate('badAccuracy'),
      };
    }
    return null;
  }, [
    autoModeEnabled,
    badAccuracy,
    isInternetAvailable,
    station,
    subscribing,
    warningDismissed,
  ]);

  useEffect(() => {
    const info = getWarningInfo();
    setWarningInfo(info);
  }, [getWarningInfo]);

  useFocusEffect(
    useCallback(() => {
      const listener = addScreenshotListener(() => {
        if (selectedBound) {
          setWarningInfo({
            level: 'INFO' as const,
            text: translate('shareNotice'),
          });
        }
      });

      return () => listener.remove();
    }, [selectedBound])
  );

  const onWarningPress = (): void => setWarningDismissed(true);

  const NullableWarningPanel: React.FC = () =>
    warningInfo ? (
      <WarningPanel
        onPress={onWarningPress}
        text={warningInfo.text}
        warningLevel={warningInfo.level}
      />
    ) : null;

  const { showActionSheetWithOptions } = useActionSheet();

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
                handleBackButtonPress();
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
                // handleMirroringShare();
                break;
              }
              // handleReport();
              break;
            // iOS: mirroring share or feedback, Android: Feedback
            case 2: {
              if (Platform.OS === 'ios') {
                if (devMode) {
                  // handleMirroringShare();
                  break;
                }
                // handleReport();
                break;
              }
              // handleReport();
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

  const nextStation = useNextStation();

  const isLast = useMemo(() => {
    if (getIsLoopLine(currentLine, trainType)) {
      return false;
    }

    return selectedDirection === 'INBOUND'
      ? stations.findIndex((s) => s.groupId === nextStation?.groupId) ===
          stations.length - 1
      : stations
          .slice()
          .reverse()
          .findIndex((s) => s.groupId === nextStation?.groupId) ===
          stations.length - 1;
  }, [
    currentLine,
    nextStation?.groupId,
    selectedDirection,
    stations,
    trainType,
  ]);

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
              line={currentLine}
              isLast={isLast}
            />
          )}
          {children}
          <NullableWarningPanel />
        </View>
      </LongPressGestureHandler>
    </ViewShot>
  );
};

export default React.memo(PermittedLayout);
