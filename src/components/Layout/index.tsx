import { LocationData } from 'expo-location';
import React, { Dispatch, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, View } from 'react-native';
import { connect } from 'react-redux';

import Header from '../../components/Header';
import { LineDirection } from '../../models/Bound';
import { HeaderTransitionState } from '../../models/HeaderTransitionState';
import { ILine, IStation } from '../../models/StationAPI';
import { AppState } from '../../store';
import { updateLocationAsync } from '../../store/actions/locationAsync';
import { fetchStationAsync } from '../../store/actions/stationAsync';
import DevOverlay from '../DevOverlay';
import WarningPanel from '../WarningPanel';

interface IProps {
  station?: IStation;
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
      return '位置情報を取得できませんでした。位置情報許可設定をご確認ください。';
    }
    if (badAccuracy) {
      return '位置情報に誤差が一定以上あるため、正常に動作しない可能性があります。';
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

  const devOverlay = (
    <DevOverlay
      currentStation={leftStations[0]}
      nextStation={leftStations[1]}
      gap={station.distance}
      location={location}
    />
    );

  return (
    <View style={styles.root}>
      {process.env.NODE_ENV === 'development' ? devOverlay : null}
      <Header
        state={headerState}
        station={station}
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

const mapStateToProps = (state: AppState) => ({
  station: state.station.station,
  location: state.location.location,
  locationError: state.location.error,
  headerState: state.navigation.headerState,
  scoredStations: state.station.scoredStations,
  leftStations: state.navigation.leftStations,
  badAccuracy: state.location.badAccuracy,
  selectedDirection: state.station.selectedDirection,
  selectedBound: state.station.selectedBound,
  selectedLine: state.line.selectedLine,
});

const mapDispatchToProps = (dispatch: Dispatch<any>) => ({
  watchLocation: () => dispatch(updateLocationAsync()),
  fetchStation: (location: LocationData) =>
    dispatch(fetchStationAsync(location)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Layout);
