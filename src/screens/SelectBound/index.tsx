import React, { Dispatch, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import {
  NavigationParams,
  NavigationScreenProp,
  NavigationState,
} from 'react-navigation';
import { connect } from 'react-redux';

import { LineDirection } from '../../models/Bound';
import { ILine, IStation } from '../../models/StationAPI';
import SelectBound from '../../phases/SelectBound';
import { AppState } from '../../store';
import { updateSelectedLine as updateSelectedLineDispatcher } from '../../store/actions/line';
import {
  updateSelectedBound as updateSelectedBoundDispatcher,
  updateSelectedDirection as updateSelectedDirectionDispatcher,
} from '../../store/actions/station';
import { fetchStationListAsync } from '../../store/actions/stationAsync';
import { getCurrentStationIndex } from '../../utils/currentStationIndex';
import { isLoopLine } from '../../utils/loopLine';

interface IProps {
  navigation: NavigationScreenProp<NavigationState, NavigationParams>;
  fetchStationList: (lineId: number) => void;
  selectedLine: ILine;
  stations: IStation[];
  station: IStation;
  updateSelectedBound: (station: IStation) => void;
  updateSelectedDirection: (direction: LineDirection) => void;
  updateSelectedLine: (line: ILine) => void;
}

const styles = StyleSheet.create({
  boundLoading: {
    marginTop: 24,
  },
});

const SelectBoundScreen = ({
  navigation,
  fetchStationList,
  selectedLine,
  stations,
  station,
  updateSelectedBound,
  updateSelectedDirection,
  updateSelectedLine,
}: IProps) => {
  const [loopLine, setLoopLine] = useState(false);

  useEffect(() => {
    fetchStationList(parseInt(selectedLine.id, 10));
    setLoopLine(isLoopLine(selectedLine));
  }, []);

  if (!stations.length) {
    return <ActivityIndicator style={styles.boundLoading} size='large' />;
  }

  const inboundStation = stations[stations.length - 1];
  const outboundStation = stations[0];
  const inboundStationForLoopLine = () => {
    const maybeIndex = getCurrentStationIndex(stations, station) - 4;
    const fallbackIndex = stations.length - 1 - 7;
    const index =
      maybeIndex < 0 || maybeIndex > stations.length
        ? fallbackIndex
        : maybeIndex;
    return stations[index];
  };
  const outboundStationForLoopline = () => {
    const maybeIndex = getCurrentStationIndex(stations, station) + 4;
    const fallbackIndex = Math.floor((stations.length - 1) / 4);
    const index =
      maybeIndex < 0 || maybeIndex > stations.length
        ? fallbackIndex
        : maybeIndex;
    return stations[index];
  };

  const computedInboundStation = loopLine
    ? inboundStationForLoopLine()
    : inboundStation;
  const computedOutboundStation = loopLine
    ? outboundStationForLoopline()
    : outboundStation;

  const handleBoundSelected = (selectedStation: IStation, direction: LineDirection) => {
    updateSelectedBound(selectedStation);
    updateSelectedDirection(direction);
    navigation.navigate('Main');
  };

  const handleSelecBoundBackButtonPress = () => {
    updateSelectedLine(null);
    setLoopLine(false);
    navigation.navigate('SelectLine');
  };

  return (
    <>
      <SelectBound
        inboundStation={computedInboundStation}
        outboundStation={computedOutboundStation}
        loopLine={loopLine}
        onBoundSelected={handleBoundSelected}
        onBackButtonPress={handleSelecBoundBackButtonPress}
      />
    </>
  );
};

const mapStateToProps = (state: AppState) => ({
  selectedLine: state.line.selectedLine,
  stations: state.station.stations,
  station: state.station.station,
});

const mapDispatchToProps = (dispatch: Dispatch<any>) => ({
  fetchStationList: (lineId: number) => dispatch(fetchStationListAsync(lineId)),
  updateSelectedLine: (line: ILine) =>
    dispatch(updateSelectedLineDispatcher(line)),
  updateSelectedBound: (station: IStation) =>
    dispatch(updateSelectedBoundDispatcher(station)),
  updateSelectedDirection: (direction: LineDirection) =>
    dispatch(updateSelectedDirectionDispatcher(direction)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(SelectBoundScreen);
