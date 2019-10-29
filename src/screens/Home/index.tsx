import { LocationData } from 'expo-location';
import React, { Dispatch, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, View } from 'react-native';
import { connect } from 'react-redux';

import FAB from '../../components/FAB';
import Header from '../../components/Header';
import WarningPanel from '../../components/WarningPanel';
import { BottomTransitionState } from '../../models/BottomTransitionState';
import { LineDirection } from '../../models/Bound';
import { HeaderTransitionState } from '../../models/HeaderTransitionState';
import { ILine, IStation } from '../../models/StationAPI';
import Main from '../../phases/Main';
import SelectBound from '../../phases/SelectBound';
import SelectLine from '../../phases/SelectLine';
import { AppState } from '../../store';
import { updateLocationAsync } from '../../store/actions/locationAsync';
import {
    refreshHeaderState, setRefreshHeaderStateIntervalId as setRefreshHeaderStateIntervalIdDispatcher,
} from '../../store/actions/navigation';
import {
    refreshBottomStateAsync, refreshLeftStationsAsync, transitionHeaderStateAsync,
    watchApproachingAsync,
} from '../../store/actions/navigationAsync';
import {
    fetchStationAsync, fetchStationListAsync, refreshNearestStationAsync,
} from '../../store/actions/stationAsync';
import { getCurrentStationIndex } from '../../utils/currentStationIndex';
import { isLoopLine } from '../../utils/loopLine';
import Amplitude from '../../vendor/amplitude';

interface IProps {
  nearestStation: IStation;
  stations: IStation[];
  location: LocationData;
  locationError: Error;
  watchLocation: () => void;
  fetchStation: (location: LocationData) => void;
  fetchStationList: (lineId: number) => void;
  headerState: HeaderTransitionState;
  refreshLeftStations: (selectedLine: ILine, direction: LineDirection) => void;
  bottomTransitionState: BottomTransitionState;
  leftStations: IStation[];
  transitionHeaderState: () => void;
  refreshNearestStation: (location: LocationData) => void;
  refreshBottomState: (selectedLine: ILine) => void;
  arrived: boolean;
  badAccuracy: boolean;
  watchApproaching: () => void;
  headerStateIntervalId: number;
  setRefreshHeaderStateIntervalId: (id: number) => void;
  setHeaderState: (state: HeaderTransitionState) => void;
}

const styles = StyleSheet.create({
  root: {
    height: Dimensions.get('screen').height,
    overflow: 'hidden',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boundLoading: {
    marginTop: 24,
  },
});

type DisplayPhase = 'SELECT_LINE' | 'SELECT_BOUND' | 'MAIN';

const HomeScreen = (props: IProps) => {
  const {
    nearestStation,
    location,
    watchLocation,
    fetchStation,
    fetchStationList,
    stations,
    headerState,
    refreshLeftStations,
    bottomTransitionState,
    leftStations,
    transitionHeaderState,
    refreshNearestStation,
    refreshBottomState,
    arrived,
    locationError,
    badAccuracy,
    watchApproaching,
    headerStateIntervalId,
    setRefreshHeaderStateIntervalId,
    setHeaderState,
  } = props;

  const [selectedBound, setSelectedBound] = useState<IStation>(null);
  const [phase, setPhase] = useState<DisplayPhase>('SELECT_LINE');
  const [selectedLine, setSelectedLine] = useState<ILine>(null);
  const [loopLine, setLoopLine] = useState(false);
  const [selectedDirection, setSelectedDirection] = useState<LineDirection>(
    null,
  );
  const [timerStarted, setTimerStarted] = useState(false);
  const [warningDismissed, setWarningDismissed] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      Amplitude.logEvent('Startup');
    }
  }, []);

  useEffect(() => {
    if (!location) {
      watchLocation();
      return;
    }
    if (!nearestStation) {
      fetchStation(location);
    }
    if (stations) {
      refreshLeftStations(selectedLine, selectedDirection);
      if (!timerStarted && selectedDirection) {
        transitionHeaderState();
        refreshBottomState(selectedLine);
        setTimerStarted(true);
      }
    }
  }, [nearestStation, location, stations, selectedDirection]);

  useEffect(() => {
    if (location && timerStarted) {
      watchApproaching();
    }
  }, [location, timerStarted, leftStations]);

  useEffect(() => {
    if (location && timerStarted) {
      refreshNearestStation(location);
    }
  }, [location, timerStarted]);

  if (!nearestStation) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size='large' />
      </View>
    );
  }

  const handleForceRefresh = () => fetchStation(location);

  const renderPhase = () => {
    switch (phase) {
      case 'SELECT_LINE':
        const handleLineSelected = (line: ILine) => {
          setSelectedLine(line);
          setLoopLine(isLoopLine(line));
          setPhase('SELECT_BOUND');
        };
        return (
          <>
            <SelectLine
              nearestStation={nearestStation}
              onLineSelected={handleLineSelected}
            />
            <FAB onPress={handleForceRefresh} />
          </>
        );
      case 'SELECT_BOUND':
        if (!selectedLine) {
          return;
        }
        fetchStationList(parseInt(selectedLine.id, 10));
        if (!stations.length) {
          return <ActivityIndicator style={styles.boundLoading} size='large' />;
        }
        const handleBoundSelected = (
          station: IStation,
          direction: LineDirection,
        ) => {
          setSelectedBound(station);
          setSelectedDirection(direction);
          setPhase('MAIN');
        };

        const inboundStation = stations[stations.length - 1];
        const outboundStation = stations[0];
        const inboundStationForLoopLine = () => {
          const maybeIndex =
            getCurrentStationIndex(stations, nearestStation) - 4;
          const fallbackIndex = stations.length - 1 - 7;
          const index =
            maybeIndex < 0 || maybeIndex > stations.length
              ? fallbackIndex
              : maybeIndex;
          return stations[index];
        };
        const outboundStationForLoopline = () => {
          const maybeIndex =
            getCurrentStationIndex(stations, nearestStation) + 4;
          const fallbackIndex = Math.floor((stations.length - 1) / 4);
          const index =
            maybeIndex < 0 || maybeIndex > stations.length
              ? fallbackIndex
              : maybeIndex;
          return stations[index];
        };
        const handleSelecBoundBackButtonPress = () => {
          setSelectedLine(null);
          setLoopLine(false);
          setPhase('SELECT_LINE');
        };

        return (
          <>
            <SelectBound
              inboundStation={loopLine ? inboundStationForLoopLine() : inboundStation}
              outboundStation={loopLine ? outboundStationForLoopline() : outboundStation}
              loopLine={loopLine}
              onBoundSelected={handleBoundSelected}
              onBackButtonPress={handleSelecBoundBackButtonPress}
            />
            <FAB onPress={handleForceRefresh} />
          </>
        );
      case 'MAIN':
        const handleMainBackButtonPress = () => {
            setHeaderState('CURRENT');
            setSelectedBound(null);
            clearInterval(headerStateIntervalId);
            setRefreshHeaderStateIntervalId(null);
            setTimerStarted(false);
            setPhase('SELECT_BOUND');
        };

        return (
          <Main
            arrived={arrived}
            line={selectedLine}
            leftStations={leftStations}
            state={bottomTransitionState}
            onBackButtonPress={handleMainBackButtonPress}
          />
        );
    }
  };

  const getWarningText = () => {
    if (warningDismissed) {
      return;
    }
    if (locationError) {
      return '位置情報を取得できませんでした。位置情報許可設定をご確認ください。';
    }
    if (badAccuracy) {
      return 'GPSの誤差が1km以上あるため、正常に動作しない可能性があります。';
    }
  };
  const warningText = getWarningText();
  const onWarningPress = () => setWarningDismissed(true);

  return (
    <View style={styles.root}>
      <Header
        state={headerState}
        station={nearestStation}
        nextStation={leftStations[1]}
        line={selectedLine}
        lineDirection={selectedDirection}
        boundStation={selectedBound}
        loopLine={isLoopLine(selectedLine)}
      />
      {renderPhase()}
      {warningText ? <WarningPanel onPress={onWarningPress} text={warningText} /> : null}
    </View>
  );
};

const mapStateToProps = (state: AppState) => ({
  headerState: state.navigation.headerState,
  location: state.location.location,
  locationError: state.location.error,
  nearestStation: state.station.station,
  stations: state.station.stations,
  bottomTransitionState: state.navigation.bottomState,
  leftStations: state.navigation.leftStations,
  arrived: state.station.arrived,
  badAccuracy: state.location.badAccuracy,
  headerStateIntervalId: state.navigation.refreshHeaderStateIntervalId,
});

const mapDispatchToProps = (dispatch: Dispatch<any>) => ({
  watchLocation: () => dispatch(updateLocationAsync()),
  fetchStation: (location: LocationData) =>
    dispatch(fetchStationAsync(location)),
  fetchStationList: (lineId: number) => dispatch(fetchStationListAsync(lineId)),
  refreshLeftStations: (selectedLine: ILine, direction: LineDirection) =>
    dispatch(refreshLeftStationsAsync(selectedLine, direction)),
  transitionHeaderState: () => dispatch(transitionHeaderStateAsync()),
  watchApproaching: () => dispatch(watchApproachingAsync()),
  refreshNearestStation: (location: LocationData) =>
    dispatch(refreshNearestStationAsync(location)),
  refreshBottomState: (selectedLine: ILine) =>
    dispatch(refreshBottomStateAsync(selectedLine)),
  setRefreshHeaderStateIntervalId: (id: number) =>
    dispatch(setRefreshHeaderStateIntervalIdDispatcher(id)),
  setHeaderState: (state: HeaderTransitionState) => dispatch(refreshHeaderState(state)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(HomeScreen);
