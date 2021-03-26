import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Dimensions, Platform, Alert } from 'react-native';
import { useRecoilState, useRecoilValue } from 'recoil';
import { LongPressGestureHandler, State } from 'react-native-gesture-handler';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';
import * as Haptics from 'expo-haptics';
import { useActionSheet } from '@expo/react-native-action-sheet';
import ViewShot from 'react-native-view-shot';
import { useNavigation } from '@react-navigation/native';
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
  const [
    { station, stations, selectedDirection, selectedBound },
    setStation,
  ] = useRecoilState(stationState);
  const { selectedLine } = useRecoilValue(lineState);
  const { location, badAccuracy } = useRecoilValue(locationState);
  const [
    { headerState, headerShown, stationForHeader, leftStations, trainType },
    setNavigation,
  ] = useRecoilState(navigationState);

  useDetectBadAccuracy();

  const warningText = useMemo((): string | null => {
    if (warningDismissed) {
      return null;
    }
    if (badAccuracy) {
      return translate('badAccuracy');
    }
    return null;
  }, [badAccuracy, warningDismissed]);
  const onWarningPress = (): void => setWarningDismissed(true);

  const rootExtraStyle = {
    height: windowHeight,
  };

  const NullableWarningPanel: React.FC = () =>
    warningText ? (
      <WarningPanel
        dismissible={!!badAccuracy}
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
    navigation.navigate('SelectBound');
  }, [navigation, setNavigation, setStation]);

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

  const onLongPress = ({ nativeEvent }): void => {
    if (!selectedBound) {
      return;
    }

    if (nativeEvent.state === State.ACTIVE) {
      Haptics.selectionAsync();
      showActionSheetWithOptions(
        {
          options:
            Platform.OS === 'ios'
              ? [translate('back'), translate('share'), translate('cancel')]
              : [translate('share'), translate('cancel')],
          destructiveButtonIndex: 0,
          cancelButtonIndex: Platform.OS === 'ios' ? 2 : 1,
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
            // iOS: share, Android: cancel
            case 1:
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

  const outboundCurrentStationIndex = stations
    .slice()
    .reverse()
    .findIndex((s) => {
      if (s?.name === station.name) {
        return true;
      }
      return false;
    });

  const actualNextStation = leftStations[1];

  const nextOutboundStopStation = actualNextStation?.pass
    ? stations
        .slice()
        .reverse()
        .slice(outboundCurrentStationIndex - stations.length + 1)
        .find((s, i) => {
          if (i && !s.pass) {
            return true;
          }
          return false;
        })
    : actualNextStation;

  const inboundCurrentStationIndex = stations.slice().findIndex((s) => {
    if (s?.name === station.name) {
      return true;
    }
    return false;
  });
  const nextInboundStopStation = actualNextStation?.pass
    ? stations
        .slice(inboundCurrentStationIndex - stations.length + 1)
        .find((s, i) => {
          if (i && !s.pass) {
            return true;
          }
          return false;
        })
    : actualNextStation;

  const nextStation =
    selectedDirection === 'INBOUND'
      ? nextInboundStopStation
      : nextOutboundStopStation;

  const joinedLineIds = trainType?.lines.map((l) => l.id);
  const currentLine =
    leftStations.map((s) =>
      s.lines.find((l) => joinedLineIds?.find((il) => l.id === il))
    )[0] || selectedLine;

  return (
    <ViewShot ref={viewShotRef} options={{ format: 'png' }}>
      <LongPressGestureHandler
        onHandlerStateChange={onLongPress}
        minDurationMs={500}
      >
        <View style={[styles.root, rootExtraStyle]} onLayout={onLayout}>
          {/* eslint-disable-next-line no-undef */}
          {__DEV__ && station && location && <DevOverlay location={location} />}
          {station && headerShown && (
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
          {children}
          <NullableWarningPanel />
        </View>
      </LongPressGestureHandler>
    </ViewShot>
  );
};

export default PermittedLayout;
