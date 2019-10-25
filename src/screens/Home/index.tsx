import { LocationData } from 'expo-location';
import React, { Dispatch, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { connect } from 'react-redux';

import Header from '../../components/Header';
import { BottomTransitionState } from '../../models/BottomTransitionState';
import { LineDirection } from '../../models/Bound';
import { HeaderTransitionState } from '../../models/HeaderTransitionState';
import { ILine, IStation } from '../../models/StationAPI';
import Main from '../../phases/Main';
import SelectBound from '../../phases/SelectBound';
import SelectLine from '../../phases/SelectLine';
import { AppState } from '../../store';
import { updateLocationAsync } from '../../store/actions/locationAsync';
import { refreshLeftStationsAsync } from '../../store/actions/navigationAsync';
import {
  fetchStationAsync,
  fetchStationListAsync,
} from '../../store/actions/stationAsync';
import { getCurrentStationIndex } from '../../utils/currentStationIndex';
import { isLoopLine } from '../../utils/loopLine';

interface IProps {
  nearestStation: IStation;
  stations: IStation[];
  location: LocationData;
  locationError: Error;
  watchLocation: () => void;
  fetchStation: (location: LocationData) => void;
  fetchStationList: (lineId: number) => void;
  headerState: HeaderTransitionState;
  refreshLeftStations: (
    selectedLine: ILine,
    direction: LineDirection,
  ) => void;
  bottomTransitionState: BottomTransitionState;
  leftStations: IStation[];
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
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
  } = props;

  const [selectedBound, setSelectedBound] = useState<IStation>(null);
  const [phase, setPhase] = useState<DisplayPhase>('SELECT_LINE');
  const [selectedLine, setSelectedLine] = useState<ILine>(null);
  const [loopLine, setLoopLine] = useState(false);
  const [selectedDirection, setSelectedDirection] = useState<LineDirection>(
    null,
  );

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
    }
  }, [nearestStation, location, stations, selectedDirection]);

  if (!nearestStation) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size='large' />
      </View>
    );
  }

  const renderPhase = () => {
    switch (phase) {
      case 'SELECT_LINE':
        const handleLineSelected = (line: ILine) => {
          setSelectedLine(line);
          setLoopLine(isLoopLine(line));
          setPhase('SELECT_BOUND');
        };
        return (
          <SelectLine
            nearestStation={nearestStation}
            onLineSelected={handleLineSelected}
          />
        );
      case 'SELECT_BOUND':
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
        const handleBackButtonPress = () => {
          setSelectedLine(null);
          setLoopLine(false);
          setPhase('SELECT_LINE');
        };

        return (
          <SelectBound
            inboundStation={loopLine ? inboundStationForLoopLine() : inboundStation}
            outboundStation={loopLine ? outboundStationForLoopline() : outboundStation}
            loopLine={loopLine}
            onBoundSelected={handleBoundSelected}
            onBackButtonPress={handleBackButtonPress}
          />
        );
      case 'MAIN':
        return (
          <Main line={selectedLine} leftStations={leftStations} state={bottomTransitionState} />
        );
    }
  };

  return (
    <View style={styles.root}>
      <Header
        state={headerState}
        station={nearestStation}
        line={selectedLine}
        lineDirection={selectedDirection}
        boundStation={selectedBound}
        loopLine={isLoopLine(selectedLine)}
      />
      {renderPhase()}
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
});

const mapDispatchToProps = (dispatch: Dispatch<any>) => ({
  watchLocation: () => dispatch(updateLocationAsync()),
  fetchStation: (location: LocationData) =>
    dispatch(fetchStationAsync(location)),
  fetchStationList: (lineId: number) => dispatch(fetchStationListAsync(lineId)),
  refreshLeftStations: (
    selectedLine: ILine,
    direction: LineDirection,
  ) =>
    dispatch(
      refreshLeftStationsAsync(
        selectedLine,
        direction,
      ),
    ),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(HomeScreen);
