import i18n from 'i18n-js';
import React, { Dispatch, useEffect, useState, useCallback, memo } from 'react';
import {
  ActionSheetIOS,
  Dimensions,
  Platform,
  StyleSheet,
  View,
  BackHandler,
} from 'react-native';
import {
  State,
  LongPressGestureHandler,
  TouchableWithoutFeedback,
} from 'react-native-gesture-handler';
import { useDispatch, useSelector } from 'react-redux';
import * as Haptics from 'expo-haptics';

import { useNavigation } from '@react-navigation/native';
import { TrainLCDAppState } from '../../store';
import {
  getCurrentStationLinesWithoutCurrentLine,
  getNextStationLinesWithoutCurrentLine,
} from '../../utils/line';
import getTranslatedText from '../../utils/translate';
import useTransitionHeaderState from '../../hooks/useTransitionHeaderState';
import useUpdateBottomState from '../../hooks/useUpdateBottomState';
import useRefreshStation from '../../hooks/useRefreshStation';
import useRefreshLeftStations from '../../hooks/useRefreshLeftStations';
import useWatchApproaching from '../../hooks/useWatchApproaching';
import { NavigationActionTypes } from '../../store/types/navigation';
import LineBoard from '../../components/LineBoard';
import {
  updateBottomState,
  updateHeaderState,
} from '../../store/actions/navigation';
import {
  updateSelectedDirection,
  updateSelectedBound,
} from '../../store/actions/station';
import { StationActionTypes } from '../../store/types/station';
import Transfers from '../../components/Transfers';

const MainScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch<
    Dispatch<NavigationActionTypes | StationActionTypes>
  >();
  const { selectedLine } = useSelector((state: TrainLCDAppState) => state.line);
  const { selectedDirection, arrived } = useSelector(
    (state: TrainLCDAppState) => state.station
  );
  const { leftStations, bottomState } = useSelector(
    (state: TrainLCDAppState) => state.navigation
  );

  const handleBackButtonPress = useCallback(() => {
    dispatch(
      updateHeaderState(i18n.locale === 'ja' ? 'CURRENT' : 'CURRENT_EN')
    );
    dispatch(updateBottomState('LINE'));
    dispatch(updateSelectedDirection(null));
    dispatch(updateSelectedBound(null));
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [dispatch, navigation]);

  useTransitionHeaderState();
  useRefreshLeftStations(selectedLine, selectedDirection);
  useRefreshStation();
  const [refreshBottomStateFunc] = useUpdateBottomState();
  useWatchApproaching();

  const handler = BackHandler.addEventListener('hardwareBackPress', () => {
    handleBackButtonPress();
    return true;
  });

  useEffect(() => {
    refreshBottomStateFunc();

    return (): void => {
      if (handler) {
        handler.remove();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const transferLines = arrived
    ? getCurrentStationLinesWithoutCurrentLine(leftStations, selectedLine)
    : getNextStationLinesWithoutCurrentLine(leftStations, selectedLine);

  const onLongPress = ({ nativeEvent }): void => {
    if (nativeEvent.state === State.ACTIVE) {
      if (Platform.OS !== 'ios') {
        return;
      }
      Haptics.selectionAsync();
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [getTranslatedText('back'), getTranslatedText('cancel')],
          destructiveButtonIndex: 0,
          cancelButtonIndex: 1,
        },
        (buttonIndex) => {
          if (!buttonIndex) {
            handleBackButtonPress();
          }
        }
      );
    }
  };

  const [windowHeight, setWindowHeight] = useState(
    Dimensions.get('window').height
  );

  const styles = StyleSheet.create({
    touchable: {
      height: windowHeight - 128,
    },
  });

  const onLayout = (): void => {
    setWindowHeight(Dimensions.get('window').height);
  };

  const toTransferState = (): void => {
    if (transferLines.length) {
      dispatch(updateBottomState('TRANSFER'));
    }
  };

  const toLineState = (): void => {
    dispatch(updateBottomState('LINE'));
  };

  switch (bottomState) {
    case 'LINE':
      return (
        <LongPressGestureHandler
          onHandlerStateChange={onLongPress}
          minDurationMs={800}
        >
          <View onLayout={onLayout} style={{ flex: 1, height: windowHeight }}>
            <TouchableWithoutFeedback
              onPress={toTransferState}
              style={styles.touchable}
            >
              <LineBoard
                arrived={arrived}
                line={selectedLine}
                stations={leftStations}
              />
            </TouchableWithoutFeedback>
          </View>
        </LongPressGestureHandler>
      );
    case 'TRANSFER':
      return (
        <LongPressGestureHandler
          onHandlerStateChange={onLongPress}
          minDurationMs={800}
        >
          <View onLayout={onLayout} style={styles.touchable}>
            <Transfers onPress={toLineState} lines={transferLines} />
          </View>
        </LongPressGestureHandler>
      );
    default:
      return <></>;
  }
};

export default memo(MainScreen);
