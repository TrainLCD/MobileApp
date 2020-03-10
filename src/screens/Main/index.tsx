import {StackNavigationProp} from '@react-navigation/stack';
import {LocationData} from 'expo-location';
import i18n from 'i18n-js';
import React, {Dispatch, useEffect, useState} from 'react';
import {ActionSheetIOS, BackHandler, Dimensions, Platform, View} from 'react-native';
import {LongPressGestureHandler, State} from 'react-native-gesture-handler';
import {connect} from 'react-redux';

import LineBoard from '../../components/LineBoard';
import Transfers from '../../components/Transfers';
import {BottomTransitionState} from '../../models/BottomTransitionState';
import {LineDirection} from '../../models/Bound';
import {HeaderTransitionState} from '../../models/HeaderTransitionState';
import {ILine, IStation} from '../../models/StationAPI';
import {AppState} from '../../store';
import {
  refreshHeaderState,
  updateRefreshHeaderStateIntervalIds as updateRefreshHeaderStateIntervalIdsDispatcher,
} from '../../store/actions/navigation';
import {
  refreshBottomStateAsync,
  refreshLeftStationsAsync,
  transitionHeaderStateAsync,
  watchApproachingAsync,
} from '../../store/actions/navigationAsync';
import {
  updateSelectedBound as updateSelectedBoundDispatcher,
  updateSelectedDirection as updateSelectedDirectionDispatcher,
} from '../../store/actions/station';
import {refreshNearestStationAsync} from '../../store/actions/stationAsync';
import {getCurrentStationLinesWithoutCurrentLine, getNextStationLinesWithoutCurrentLine} from '../../utils/jr';

interface IProps {
  location: LocationData;
  arrived: boolean;
  selectedLine: ILine;
  leftStations: IStation[];
  bottomTransitionState: BottomTransitionState;
  updateHeaderState: (state: HeaderTransitionState) => void;
  refreshHeaderStateIntervalIds: number[];
  updateRefreshHeaderStateIntervalIds: (ids: number[]) => void;
  updateSelectedDirection: (direction: LineDirection) => void;
  updateSelectedBound: (station: IStation) => void;
  navigation: StackNavigationProp<any>;
  refreshLeftStations: (selectedLine: ILine, direction: LineDirection) => void;
  selectedDirection: LineDirection;
  transitionHeaderState: () => void;
  refreshBottomState: (selectedLine: ILine) => void;
  refreshNearestStation: (location: LocationData) => void;
  watchApproaching: () => void;
}

const MainScreen = ({
                      location,
                      arrived,
                      selectedLine,
                      leftStations,
                      bottomTransitionState,
                      updateHeaderState,
                      refreshHeaderStateIntervalIds,
                      updateRefreshHeaderStateIntervalIds,
                      updateSelectedDirection,
                      updateSelectedBound,
                      refreshLeftStations,
                      navigation,
                      selectedDirection,
                      transitionHeaderState,
                      refreshBottomState,
                      refreshNearestStation,
                      watchApproaching,
                    }: IProps) => {

  const handler = BackHandler.addEventListener('hardwareBackPress', () => {
    handleBackButtonPress();
    return true;
  });

  useEffect(() => {
    transitionHeaderState();
    refreshBottomState(selectedLine);
  }, []);

  useEffect(() => {
    refreshNearestStation(location);
    watchApproaching();
    refreshLeftStations(selectedLine, selectedDirection);
    return () => {
      handler.remove();
    };
  }, [location, selectedLine, selectedDirection, arrived]);

  const handleBackButtonPress = () => {
    updateHeaderState(i18n.locale === 'ja' ? 'CURRENT' : 'CURRENT_EN');
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

  const transferLines = arrived
    ? getCurrentStationLinesWithoutCurrentLine(leftStations, selectedLine)
    : getNextStationLinesWithoutCurrentLine(leftStations, selectedLine);

  const onLongPress = ({nativeEvent}) => {
    if (nativeEvent.state === State.ACTIVE) {
      if (Platform.OS !== 'ios') {
        return;
      }
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['戻る', 'キャンセル'],
          destructiveButtonIndex: 0,
          cancelButtonIndex: 1,
        },
        (buttonIndex) => {
          if (!buttonIndex) {
            handleBackButtonPress();
          }
        },
      );
    }
  };

  const [windowHeight, setWindowHeight] = useState(
    Dimensions.get('window').height,
  );

  const onLayout = () => {
    setWindowHeight(Dimensions.get('window').height);
  };

  switch (bottomTransitionState) {
    case 'LINE':
      return (
        <LongPressGestureHandler
          onHandlerStateChange={onLongPress}
          minDurationMs={800}
        >
          <View onLayout={onLayout} style={{flex: 1, height: windowHeight}}>
            <LineBoard
              arrived={arrived}
              line={selectedLine}
              stations={leftStations}
            />
          </View>
        </LongPressGestureHandler>
      );
    case 'TRANSFER':
      return (
        <LongPressGestureHandler
          onHandlerStateChange={onLongPress}
          minDurationMs={800}
        >
          <View onLayout={onLayout} style={{flex: 1, height: windowHeight}}>
            <Transfers lines={transferLines}/>
          </View>
        </LongPressGestureHandler>
      );
  }
};

const mapStateToProps = (state: AppState) => ({
  location: state.location.location,
  arrived: state.station.arrived,
  selectedLine: state.line.selectedLine,
  leftStations: state.navigation.leftStations,
  bottomTransitionState: state.navigation.bottomState,
  refreshHeaderStateIntervalIds: state.navigation.refreshHeaderStateIntervalIds,
  selectedDirection: state.station.selectedDirection,
});

const mapDispatchToProps = (dispatch: Dispatch<any>) => ({
  updateHeaderState: (state: HeaderTransitionState) =>
    dispatch(refreshHeaderState(state)),
  updateRefreshHeaderStateIntervalIds: (ids: number[]) =>
    updateRefreshHeaderStateIntervalIdsDispatcher(ids),
  updateSelectedDirection: (direction: LineDirection) =>
    dispatch(updateSelectedDirectionDispatcher(direction)),
  updateSelectedBound: (station: IStation) =>
    dispatch(updateSelectedBoundDispatcher(station)),
  refreshLeftStations: (selectedLine: ILine, direction: LineDirection) =>
    dispatch(refreshLeftStationsAsync(selectedLine, direction)),
  transitionHeaderState: () => dispatch(transitionHeaderStateAsync()),
  refreshBottomState: (selectedLine: ILine) =>
    dispatch(refreshBottomStateAsync(selectedLine)),
  refreshNearestStation: (location: LocationData) =>
    dispatch(refreshNearestStationAsync(location)),
  watchApproaching: () => dispatch(watchApproachingAsync()),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(MainScreen);
