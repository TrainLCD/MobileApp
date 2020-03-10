import { LocationData } from 'expo-location';
import i18n from 'i18n-js';
import React, { Dispatch, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, View } from 'react-native';
import { connect } from 'react-redux';

import Header from '../../components/Header';
import { LineDirection } from '../../models/Bound';
import { HeaderTransitionState } from '../../models/HeaderTransitionState';
import { ILine, IStation } from '../../models/StationAPI';
import { TrainLCDAppState } from '../../store';
import { updateLocationAsync } from '../../store/actions/locationAsync';
import {
  refreshHeaderState,
  updateRefreshHeaderStateIntervalIds as updateRefreshHeaderStateIntervalIdsDispatcher,
} from '../../store/actions/navigation';
import {
  updateSelectedBound as updateSelectedBoundDispatcher,
  updateSelectedDirection as updateSelectedDirectionDispatcher,
} from '../../store/actions/station';
import { fetchStationAsync } from '../../store/actions/stationAsync';
import WarningPanel from '../WarningPanel';

interface IProps {
  station?: IStation;
  stations?: IStation[];
  location?: LocationData;
  badAccuracy?: boolean;
  locationError?: Error;
  headerState?: HeaderTransitionState;
  scoredStations?: IStation[];
  leftStations?: IStation[];
  selectedLine?: ILine;
  selectedDirection?: LineDirection;
  selectedBound?: IStation;
  children: React.ReactNode;
  onWarningPress?: () => void;
  fetchStation: (location: LocationData) => void;
  watchLocation: () => void;
}

const Layout = (props: IProps) => {
  const {
    location,
    locationError,
    badAccuracy,
    headerState,
    station,
    stations,
    leftStations,
    selectedLine,
    selectedDirection,
    selectedBound,
    children,
    fetchStation,
    watchLocation,
  } = props;

  const [warningDismissed, setWarningDismissed] = useState(false);
  const [windowHeight, setWindowHeight] = useState(
    Dimensions.get('window').height,
  );

  const onLayout = () => {
    setWindowHeight(Dimensions.get('window').height);
  };

  const styles = StyleSheet.create({
    root: {
      height: windowHeight,
      overflow: 'hidden',
      backgroundColor: '#fff',
    },
    loading: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#fff',
    },
  });

  useEffect(() => {
    if (!location) {
      watchLocation();
      return;
    }
    if (!station) {
      fetchStation(location);
    }
  }, [station, location]);

  const getWarningText = () => {
    if (warningDismissed) {
      return;
    }
    if (locationError) {
      return i18n.t('couldNotGetLocation');
    }
    if (badAccuracy) {
      return i18n.t('badAccuracy');
    }
  };
  const warningText = getWarningText();
  const onWarningPress = () => setWarningDismissed(true);

  const NullableWarningPanel = () =>
    warningText ? (
      <WarningPanel
        dismissible={!!badAccuracy}
        onPress={onWarningPress}
        text={warningText}
      />
    ) : null;

  if (!station) {
    return (
      <View onLayout={onLayout} style={styles.loading}>
        <ActivityIndicator size='large' />
        <NullableWarningPanel />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Header
        state={headerState}
        station={station}
        stations={stations}
        nextStation={leftStations[1]}
        line={selectedLine}
        lineDirection={selectedDirection}
        boundStation={selectedBound}
      />
      {children}
      <NullableWarningPanel />
    </View>
  );
};

const mapStateToProps = (state: TrainLCDAppState) => ({
  station: state.station.station,
  stations: state.station.stations,
  location: state.location.location,
  locationError: state.location.error,
  headerState: state.navigation.headerState,
  scoredStations: state.station.scoredStations,
  leftStations: state.navigation.leftStations,
  badAccuracy: state.location.badAccuracy,
  selectedDirection: state.station.selectedDirection,
  selectedBound: state.station.selectedBound,
  selectedLine: state.line.selectedLine,
  refreshHeaderStateIntervalIds: state.navigation.refreshHeaderStateIntervalIds,
});

const mapDispatchToProps = (dispatch: Dispatch<any>) => ({
  watchLocation: () => dispatch(updateLocationAsync()),
  fetchStation: (location: LocationData) =>
    dispatch(fetchStationAsync(location)),
  updateSelectedBound: (station: IStation) =>
    dispatch(updateSelectedBoundDispatcher(station)),
  updateHeaderState: (state: HeaderTransitionState) =>
    dispatch(refreshHeaderState(state)),
  updateRefreshHeaderStateIntervalIds: (ids: NodeJS.Timeout[]) =>
    updateRefreshHeaderStateIntervalIdsDispatcher(ids),
  updateSelectedDirection: (direction: LineDirection) =>
    dispatch(updateSelectedDirectionDispatcher(direction)),
});

export default connect(mapStateToProps, mapDispatchToProps)(Layout);
