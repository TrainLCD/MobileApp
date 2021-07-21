import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View, Dimensions, Platform, Alert } from 'react-native';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { LongPressGestureHandler, State } from 'react-native-gesture-handler';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';
import * as Haptics from 'expo-haptics';
import { useActionSheet } from '@expo/react-native-action-sheet';
import ViewShot from 'react-native-view-shot';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { LocationObject } from 'expo-location';
import Header from '../Header';
import WarningPanel from '../WarningPanel';
import DevOverlay from '../DevOverlay';
import useDetectBadAccuracy from '../../hooks/useDetectBadAccuracy';
import { isJapanese, translate } from '../../translation';
import stationState from '../../store/atoms/station';
import locationState from '../../store/atoms/location';
import navigationState from '../../store/atoms/navigation';
import lineState from '../../store/atoms/line';
import { parenthesisRegexp } from '../../constants/regexp';
import devState from '../../store/atoms/dev';
import themeState from '../../store/atoms/theme';
import {
  getNextInboundStopStation,
  getNextOutboundStopStation,
} from '../../utils/nextStation';
import getCurrentLine from '../../utils/currentLine';
import speechState from '../../store/atoms/speech';
import SpeechProvider from '../../providers/SpeechProvider';
import { ALL_AVAILABLE_LANGUAGES } from '../../constants/languages';
import AppTheme from '../../models/Theme';

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
});

type Props = {
  children: React.ReactNode;
};

const PermittedLayout: React.FC<Props> = ({ children }: Props) => {
  const [warningDismissed, setWarningDismissed] = useState(false);
  const [windowHeight, setWindowHeight] = useState(
    Dimensions.get('window').height
  );
  const onLayout = (): void => {
    setWindowHeight(Dimensions.get('window').height);
  };
  const [{ station, stations, selectedDirection, selectedBound }, setStation] =
    useRecoilState(stationState);
  const { selectedLine } = useRecoilValue(lineState);
  const [{ location, badAccuracy }, setLocation] =
    useRecoilState(locationState);
  const setTheme = useSetRecoilState(themeState);
  const [
    { headerState, stationForHeader, leftStations, trainType, autoMode },
    setNavigation,
  ] = useRecoilState(navigationState);
  const { devMode } = useRecoilValue(devState);
  const setSpeech = useSetRecoilState(speechState);

  useDetectBadAccuracy();

  useEffect(() => {
    const loadSettingsAsync = async () => {
      const prevThemeStr = await AsyncStorage.getItem(
        '@TrainLCD:previousTheme'
      );
      setTheme((prev) => ({
        ...prev,
        theme: parseInt(prevThemeStr, 10) || AppTheme.TokyoMetro,
      }));
      const enabledLanguagesStr = await AsyncStorage.getItem(
        '@TrainLCD:enabledLanguages'
      );
      setNavigation((prev) => ({
        ...prev,
        enabledLanguages:
          JSON.parse(enabledLanguagesStr) || ALL_AVAILABLE_LANGUAGES,
      }));
      const speechEnabledStr = await AsyncStorage.getItem(
        '@TrainLCD:speechEnabled'
      );
      setSpeech((prev) => ({
        ...prev,
        enabled: speechEnabledStr === 'true',
      }));
    };
    loadSettingsAsync();
  }, [setTheme, setSpeech, setNavigation]);

  useEffect(() => {
    if (autoMode) {
      setWarningDismissed(false);
    }
  }, [autoMode]);

  const warningText = useMemo((): string | null => {
    if (warningDismissed) {
      return null;
    }

    if (autoMode) {
      return translate('autoModeInProgress');
    }
    if (badAccuracy) {
      return translate('badAccuracy');
    }
    return null;
  }, [autoMode, badAccuracy, warningDismissed]);
  const onWarningPress = (): void => setWarningDismissed(true);

  const rootExtraStyle = {
    height: windowHeight,
  };

  const NullableWarningPanel: React.FC = () =>
    warningText ? (
      <WarningPanel
        dismissible={!!(badAccuracy || autoMode)}
        onPress={onWarningPress}
        text={warningText}
      />
    ) : null;

  const { showActionSheetWithOptions } = useActionSheet();
  const viewShotRef = useRef<ViewShot>(null);
  const navigation = useNavigation();

  const handleBackButtonPress = useCallback(() => {
    setNavigation((prev) => ({
      ...prev,
      headerState: isJapanese ? 'CURRENT' : 'CURRENT_EN',
      bottomState: 'LINE',
    }));
    setStation((prev) => ({
      ...prev,
      selectedDirection: null,
      selectedBound: null,
    }));
    setSpeech((prev) => ({
      ...prev,
      muted: true,
    }));
    navigation.navigate('SelectBound');
  }, [navigation, setNavigation, setSpeech, setStation]);

  const handleShare = useCallback(async () => {
    if (!viewShotRef || !selectedLine) {
      return;
    }
    try {
      const joinedLineIds = trainType?.lines.map((l) => l.id);
      const currentLine =
        leftStations.map((s) =>
          s.lines.find((l) => joinedLineIds?.find((il) => l.id === il))
        )[0] || selectedLine;

      const uri = await viewShotRef.current.capture();
      const res = await RNFS.readFile(uri, 'base64');
      const urlString = `data:image/jpeg;base64,${res}`;
      const message = isJapanese
        ? `${currentLine.name.replace(
            parenthesisRegexp,
            ''
          )}で移動中です！ #TrainLCD https://trainlcd.tinykitten.me`
        : `I'm riding ${currentLine.nameR.replace(
            parenthesisRegexp,
            ''
          )} with #TrainLCD https://trainlcd.tinykitten.me`;
      const options = {
        title: 'TrainLCD',
        message,
        url: urlString,
        type: 'image/png',
      };
      await Share.open(options);
    } catch (err) {
      if (err.message !== 'User did not share') {
        console.error(err);
        Alert.alert(translate('couldntShare'));
      }
    }
  }, [leftStations, selectedLine, trainType]);

  const forceLocationRefresh = useCallback(async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation((prev) => ({
        ...prev,
        location: loc,
      }));
    } catch (err) {
      console.warn(err);
    }
  }, [setLocation]);
  const onLongPress = async ({ nativeEvent }): Promise<void> => {
    if (!selectedBound) {
      return;
    }

    if (nativeEvent.state === State.ACTIVE) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      showActionSheetWithOptions(
        {
          options:
            Platform.OS === 'ios'
              ? [
                  translate('back'),
                  translate('forceRefresh'),
                  translate('share'),
                  translate('cancel'),
                ]
              : [
                  translate('share'),
                  translate('forceRefresh'),
                  translate('cancel'),
                ],
          destructiveButtonIndex: Platform.OS === 'ios' ? 0 : undefined,
          cancelButtonIndex: Platform.OS === 'ios' ? 3 : 2,
        },
        (buttonIndex) => {
          switch (buttonIndex) {
            // iOS: back, Android: share
            case 0:
              if (Platform.OS === 'ios') {
                handleBackButtonPress();
              } else {
                handleShare();
              }
              break;
            // iOS, Android: forceRefresh
            case 1:
              forceLocationRefresh();
              break;
            // iOS: share, Android: cancel
            case 2:
              if (Platform.OS === 'ios') {
                handleShare();
              }
              break;
            // iOS: cancel, Android: will be not passed here
            default:
              break;
          }
        }
      );
    }
  };

  const actualNextStation = leftStations[1];

  const nextInboundStopStation = getNextInboundStopStation(
    stations,
    actualNextStation,
    station
  );
  const nextOutboundStopStation = getNextOutboundStopStation(
    stations,
    actualNextStation,
    station
  );

  const nextStation =
    selectedDirection === 'INBOUND'
      ? nextInboundStopStation
      : nextOutboundStopStation;

  const joinedLineIds = trainType?.lines.map((l) => l.id);
  const currentLine = getCurrentLine(leftStations, joinedLineIds, selectedLine);

  return (
    <ViewShot ref={viewShotRef} options={{ format: 'png' }}>
      <LongPressGestureHandler
        onHandlerStateChange={onLongPress}
        minDurationMs={500}
      >
        <View style={[styles.root, rootExtraStyle]} onLayout={onLayout}>
          {/* eslint-disable-next-line no-undef */}
          {devMode && station && location && (
            <DevOverlay location={location as LocationObject} />
          )}
          {station && (
            <Header
              state={headerState}
              station={stationForHeader || station}
              stations={stations}
              nextStation={nextStation}
              line={currentLine}
              lineDirection={selectedDirection}
              boundStation={selectedBound}
            />
          )}
          <SpeechProvider>{children}</SpeechProvider>
          <NullableWarningPanel />
        </View>
      </LongPressGestureHandler>
    </ViewShot>
  );
};

export default PermittedLayout;
