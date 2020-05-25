import { LocationData } from 'expo-location';
import i18n from 'i18n-js';
import React, { Dispatch, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, View } from 'react-native';
import { connect } from 'react-redux';
import Constants from 'expo-constants';

import Header from '../Header';
import { LineDirection } from '../../models/Bound';
import { HeaderTransitionState } from '../../models/HeaderTransitionState';
import { Line, Station } from '../../models/StationAPI';
import { TrainLCDAppState } from '../../store';
import { updateLocationAsync } from '../../store/actions/locationAsync';
import { updateRefreshHeaderStateIntervalIds as updateRefreshHeaderStateIntervalIdsDispatcher } from '../../store/actions/navigation';
import {
  updateSelectedBound as updateSelectedBoundDispatcher,
  updateSelectedDirection as updateSelectedDirectionDispatcher,
} from '../../store/actions/station';
import { fetchStationAsync } from '../../store/actions/stationAsync';
import WarningPanel from '../WarningPanel';
import { NavigationActionTypes } from '../../store/types/navigation';
import DevOverlay from '../DevOverlay';

interface Props {
  station?: Station;
  stations?: Station[];
  location?: LocationData;
  badAccuracy?: boolean;
  locationError?: Error;
  headerState?: HeaderTransitionState;
  scoredStations?: Station[];
  leftStations?: Station[];
  selectedLine?: Line;
  selectedDirection?: LineDirection;
  selectedBound?: Station;
  children: React.ReactNode;
  onWarningPress?: () => void;
  fetchStation?: (location: LocationData) => void;
  watchLocation?: () => void;
}

const shouldShowDevOverlay =
  !Constants.manifest.releaseChannel ||
  Constants.manifest.releaseChannel === 'default';

const Layout: React.FC<Props> = ({
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
}: Props) => {
  const [warningDismissed, setWarningDismissed] = useState(false);
  const [windowHeight, setWindowHeight] = useState(
    Dimensions.get('window').height
  );

  const onLayout = (): void => {
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

  const getWarningText = (): string | null => {
    if (warningDismissed) {
      return null;
    }
    if (locationError) {
      return i18n.t('couldNotGetLocation');
    }
    if (badAccuracy) {
      return i18n.t('badAccuracy');
    }
    return null;
  };
  const warningText = getWarningText();
  const onWarningPress = (): void => setWarningDismissed(true);

  const NullableWarningPanel: React.FC = () =>
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
        <ActivityIndicator size="large" />
        <NullableWarningPanel />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {shouldShowDevOverlay && (
        <DevOverlay gap={station.distance} location={location} />
      )}
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

const mapStateToProps = (
  state: TrainLCDAppState
): {
  station: Station;
  stations: Station[];
  location: LocationData;
  locationError: Error;
  headerState: HeaderTransitionState;
  scoredStations: Station[];
  leftStations: Station[];
  badAccuracy: boolean;
  selectedDirection: LineDirection;
  selectedBound: Station;
  selectedLine: Line;
  refreshHeaderStateIntervalIds: NodeJS.Timer[];
} => ({
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

const mapDispatchToProps = (
  dispatch: Dispatch<unknown>
): {
  watchLocation: () => void;
  fetchStation: (location: LocationData) => void;
  updateSelectedBound: (station: Station) => void;
  updateRefreshHeaderStateIntervalIds: (
    ids: NodeJS.Timeout[]
  ) => NavigationActionTypes;
  updateSelectedDirection: (direction: LineDirection) => void;
} => ({
  watchLocation: (): void => dispatch(updateLocationAsync()),
  fetchStation: (location: LocationData): void =>
    dispatch(fetchStationAsync(location)),
  updateSelectedBound: (station: Station): void =>
    dispatch(updateSelectedBoundDispatcher(station)),
  updateRefreshHeaderStateIntervalIds: (
    ids: NodeJS.Timeout[]
  ): NavigationActionTypes =>
    updateRefreshHeaderStateIntervalIdsDispatcher(ids),
  updateSelectedDirection: (direction: LineDirection): void =>
    dispatch(updateSelectedDirectionDispatcher(direction)),
});

export default connect(mapStateToProps, mapDispatchToProps as unknown)(Layout);
