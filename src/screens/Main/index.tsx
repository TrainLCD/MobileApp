import { LocationData } from 'expo-location';
import i18n from 'i18n-js';
import React, { Dispatch, useEffect, useState } from 'react';
import {
  ActionSheetIOS,
  AppState,
  AppStateStatus,
  BackHandler,
  Dimensions,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import {
  LongPressGestureHandler,
  State,
  TouchableWithoutFeedback,
} from 'react-native-gesture-handler';
import { connect } from 'react-redux';

import { useNavigation } from '@react-navigation/native';
import LineBoard from '../../components/LineBoard';
import Transfers from '../../components/Transfers';
import { BottomTransitionState } from '../../models/BottomTransitionState';
import { LineDirection } from '../../models/Bound';
import { HeaderTransitionState } from '../../models/HeaderTransitionState';
import { Line, Station } from '../../models/StationAPI';
import { TrainLCDAppState } from '../../store';
import {
  updateBottomState as updateBottomStateFromRedux,
  updateHeaderState as updateHeaderStateFromRedux,
  updateRefreshHeaderStateIntervalIds as updateRefreshHeaderStateIntervalIdsDispatcher,
} from '../../store/actions/navigation';
import {
  refreshLeftStationsAsync,
  transitionHeaderStateAsync,
  updateBottomStateAsync,
  watchApproachingAsync,
} from '../../store/actions/navigationAsync';
import {
  updateSelectedBound as updateSelectedBoundDispatcher,
  updateSelectedDirection as updateSelectedDirectionDispatcher,
} from '../../store/actions/station';
import { refreshNearestStationAsync } from '../../store/actions/stationAsync';
import {
  getCurrentStationLinesWithoutCurrentLine,
  getNextStationLinesWithoutCurrentLine,
} from '../../utils/line';
import { NavigationActionTypes } from '../../store/types/navigation';

interface Props {
  location: LocationData;
  arrived: boolean;
  selectedLine: Line;
  leftStations: Station[];
  bottomTransitionState: BottomTransitionState;
  updateHeaderState: (state: HeaderTransitionState) => void;
  updateBottomState: (state: BottomTransitionState) => void;
  refreshHeaderStateIntervalIds: NodeJS.Timeout[];
  updateRefreshHeaderStateIntervalIds: (ids: NodeJS.Timeout[]) => void;
  updateSelectedDirection: (direction: LineDirection) => void;
  updateSelectedBound: (station: Station) => void;
  refreshLeftStations: (selectedLine: Line, direction: LineDirection) => void;
  selectedDirection: LineDirection;
  transitionHeaderState: () => void;
  refreshBottomState: (selectedLine: Line) => void;
  refreshNearestStation: (location: LocationData) => void;
  watchApproaching: () => void;
}

const MainScreen: React.FC<Props> = ({
  location,
  arrived,
  selectedLine,
  leftStations,
  bottomTransitionState,
  updateHeaderState,
  updateBottomState,
  refreshHeaderStateIntervalIds,
  updateRefreshHeaderStateIntervalIds,
  updateSelectedDirection,
  updateSelectedBound,
  refreshLeftStations,
  selectedDirection,
  transitionHeaderState,
  refreshBottomState,
  refreshNearestStation,
  watchApproaching,
}: Props) => {
  const navigation = useNavigation();
  const handleBackButtonPress = (): void => {
    updateHeaderState(i18n.locale === 'ja' ? 'CURRENT' : 'CURRENT_EN');
    updateBottomState('LINE');
    refreshHeaderStateIntervalIds.forEach((intervalId) => {
      clearInterval(intervalId);
      clearInterval(refreshHeaderStateIntervalIds.shift());
      clearInterval(refreshHeaderStateIntervalIds.pop());
    });
    updateRefreshHeaderStateIntervalIds(refreshHeaderStateIntervalIds);
    updateSelectedDirection(null);
    updateSelectedBound(null);
    navigation.navigate('SelectBound');
  };
  const handler = BackHandler.addEventListener('hardwareBackPress', () => {
    handleBackButtonPress();
    return true;
  });

  // バックグラウンドから復帰時駅情報を最新にする
  const handleAppStateChange = async (
    newState: AppStateStatus
  ): Promise<void> => {
    if (newState === 'active') {
      refreshNearestStation(location);
      refreshLeftStations(selectedLine, selectedDirection);
      watchApproaching();
    }
  };

  useEffect(() => {
    AppState.addEventListener('change', handleAppStateChange);

    transitionHeaderState();
    refreshBottomState(selectedLine);

    return (): void => {
      AppState.removeEventListener('change', handleAppStateChange);
    };
  }, []);

  useEffect(() => {
    refreshNearestStation(location);
    refreshLeftStations(selectedLine, selectedDirection);

    watchApproaching();
    return (): void => {
      handler.remove();
    };
  }, [location, selectedLine, selectedDirection, arrived]);

  const transferLines = arrived
    ? getCurrentStationLinesWithoutCurrentLine(leftStations, selectedLine)
    : getNextStationLinesWithoutCurrentLine(leftStations, selectedLine);

  const onLongPress = ({ nativeEvent }): void => {
    if (nativeEvent.state === State.ACTIVE) {
      if (Platform.OS !== 'ios') {
        return;
      }
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [i18n.t('back'), i18n.t('cancel')],
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
      updateBottomState('TRANSFER');
    }
  };

  const toLineState = (): void => {
    updateBottomState('LINE');
  };

  switch (bottomTransitionState) {
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

const mapStateToProps = (
  state: TrainLCDAppState
): {
  location: LocationData;
  arrived: boolean;
  selectedLine: Line;
  leftStations: Station[];
  bottomTransitionState: BottomTransitionState;
  refreshHeaderStateIntervalIds: NodeJS.Timer[];
  selectedDirection: LineDirection;
} => ({
  location: state.location.location,
  arrived: state.station.arrived,
  selectedLine: state.line.selectedLine,
  leftStations: state.navigation.leftStations,
  bottomTransitionState: state.navigation.bottomState,
  refreshHeaderStateIntervalIds: state.navigation.refreshHeaderStateIntervalIds,
  selectedDirection: state.station.selectedDirection,
});

const mapDispatchToProps = (
  dispatch: Dispatch<unknown>
): {
  updateHeaderState: (state: HeaderTransitionState) => void;
  updateBottomState: (state: BottomTransitionState) => void;
  updateRefreshHeaderStateIntervalIds: (
    ids: NodeJS.Timeout[]
  ) => NavigationActionTypes;
  updateSelectedDirection: (direction: LineDirection) => void;
  updateSelectedBound: (station: Station) => void;
  refreshLeftStations: (selectedLine: Line, direction: LineDirection) => void;
  transitionHeaderState: () => void;
  refreshBottomState: (selectedLine: Line) => void;
  refreshNearestStation: (location: LocationData) => void;
  watchApproaching: () => void;
} => ({
  updateHeaderState: (state: HeaderTransitionState): void =>
    dispatch(updateHeaderStateFromRedux(state)),
  updateBottomState: (state: BottomTransitionState): void =>
    dispatch(updateBottomStateFromRedux(state)),
  updateRefreshHeaderStateIntervalIds: (
    ids: NodeJS.Timeout[]
  ): NavigationActionTypes =>
    updateRefreshHeaderStateIntervalIdsDispatcher(ids),
  updateSelectedDirection: (direction: LineDirection): void =>
    dispatch(updateSelectedDirectionDispatcher(direction)),
  updateSelectedBound: (station: Station): void =>
    dispatch(updateSelectedBoundDispatcher(station)),
  refreshLeftStations: (selectedLine: Line, direction: LineDirection): void =>
    dispatch(refreshLeftStationsAsync(selectedLine, direction)),
  transitionHeaderState: (): void => dispatch(transitionHeaderStateAsync()),
  refreshBottomState: (selectedLine: Line): void =>
    dispatch(updateBottomStateAsync(selectedLine)),
  refreshNearestStation: (location: LocationData): void =>
    dispatch(refreshNearestStationAsync(location)),
  watchApproaching: (): void => dispatch(watchApproachingAsync()),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps as unknown
)(MainScreen);
