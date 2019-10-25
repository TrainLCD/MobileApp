import { LocationData } from 'expo-location';
import React, { Dispatch, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { connect } from 'react-redux';

import Header from '../../components/Header';
import { LoopLineDirection } from '../../models/Bound';
import { ILine, IStation } from '../../models/StationAPI';
import SelectBound from '../../phases/SelectBound';
import SelectLine from '../../phases/SelectLine';
import { AppState } from '../../store';
import { updateLocationAsync } from '../../store/actions/locationAsync';
import {
  fetchStationAsync,
  fetchStationListAsync,
} from '../../store/actions/stationAsync';
import { isLoopLine } from '../../utils/loopLine';

interface IProps {
  nearestStation: IStation;
  stations: IStation[];
  location: LocationData;
  locationError: Error;
  watchLocation: () => Promise<void>;
  fetchStation: (location: LocationData) => Promise<void>;
  fetchStationList: (lineId: number) => Promise<void>;
}

const styles = StyleSheet.create({
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
  } = props;
  useEffect(() => {
    if (!location) {
      watchLocation();
      return;
    }
    if (!nearestStation) {
      fetchStation(location);
    }
  }, [nearestStation, location]);

  const [phase, setPhase] = useState<DisplayPhase>('SELECT_LINE');
  const [selectedLine, setSelectedLine] = useState<ILine>(null);
  const [loopLine, setLoopLine] = useState(false);
  const [selectedBound, setSelectedBound] = useState<IStation>(null);
  const [selectedDirection, setSelectedDirection] = useState<LoopLineDirection>(
    null,
  );

  if (!nearestStation) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size='large' />
      </View>
    );
  }

  const currentStationIndex = stations.findIndex(
    (s) => s.groupId === nearestStation.groupId,
  );

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
          direction: LoopLineDirection,
        ) => {
          setSelectedBound(station);
          setSelectedDirection(direction);
          setPhase('MAIN');
        };

        const inboundStation = stations[stations.length - 1];
        const outboundStation = stations[0];
        const inboundStationForLoopLine = () => {
          const maybeIndex = this.currentStationIndex - 4;
          const fallbackIndex = stations.length - 1 - 7;
          const index =
            maybeIndex < 0 || maybeIndex > stations.length
              ? fallbackIndex
              : maybeIndex;
          return stations[index];
        };
        const outboundStationForLoopline = () => {
          const maybeIndex = this.currentStationIndex + 4;
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
    }
  };

  return (
    <View>
      <Header
        state='CURRENT'
        station={nearestStation}
        line={selectedLine}
        loopLineDirection={selectedDirection}
        boundStation={selectedBound}
      />
      {renderPhase()}
    </View>
  );
};

const mapStateToProps = (state: AppState) => ({
  location: state.location.location,
  locationError: state.location.error,
  nearestStation: state.station.station,
  stations: state.station.stations,
});

const mapDispatchToProps = (dispatch: Dispatch<any>) => ({
  watchLocation: () => dispatch(updateLocationAsync()),
  fetchStation: (location: LocationData) =>
    dispatch(fetchStationAsync(location)),
  fetchStationList: (lineId: number) => dispatch(fetchStationListAsync(lineId)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(HomeScreen);
