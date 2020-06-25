import { LocationData } from 'expo-location';
import React, { Dispatch, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, View } from 'react-native';
import { connect } from 'react-redux';
import Constants from 'expo-constants';

import Header from '../Header';
import { LineDirection } from '../../models/Bound';
import { HeaderTransitionState } from '../../models/HeaderTransitionState';
import { Line, Station } from '../../models/StationAPI';
import { TrainLCDAppState } from '../../store';
import {
  updateSelectedBound as updateSelectedBoundDispatcher,
  updateSelectedDirection as updateSelectedDirectionDispatcher,
} from '../../store/actions/station';
import WarningPanel from '../WarningPanel';
import DevOverlay from '../DevOverlay';
import getTranslatedText from '../../utils/translate';
import useWatchLocation from '../../hooks/useWatchLocation';
import useStation from '../../hooks/useStation';

interface Props {
  station?: Station;
  stations?: Station[];
  location?: LocationData;
  badAccuracy?: boolean;
  headerState?: HeaderTransitionState;
  scoredStations?: Station[];
  leftStations?: Station[];
  selectedLine?: Line;
  selectedDirection?: LineDirection;
  selectedBound?: Station;
  children: React.ReactNode;
  onWarningPress?: () => void;
}

const shouldShowDevOverlay = Constants.manifest
  ? !Constants.manifest.releaseChannel ||
    Constants.manifest.releaseChannel === 'default'
  : false;

const Layout: React.FC<Props> = ({
  location,
  badAccuracy,
  headerState,
  station,
  stations,
  leftStations,
  selectedLine,
  selectedDirection,
  selectedBound,
  children,
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

  const [watchLocationError] = useWatchLocation();
  const [fetchStationFunc, fetchStationsError] = useStation();

  useEffect(() => {
    if (!location) {
      return;
    }
    if (!station) {
      fetchStationFunc(location);
    }
  }, [station, fetchStationFunc, location]);

  const getWarningText = (): string | null => {
    if (warningDismissed) {
      return null;
    }
    if (watchLocationError) {
      return getTranslatedText('couldNotGetLocation');
    }
    if (badAccuracy) {
      return getTranslatedText('badAccuracy');
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
  headerState: HeaderTransitionState;
  scoredStations: Station[];
  leftStations: Station[];
  badAccuracy: boolean;
  selectedDirection: LineDirection;
  selectedBound: Station;
  selectedLine: Line;
} => ({
  station: state.station.station,
  stations: state.station.stations,
  location: state.location.location,
  headerState: state.navigation.headerState,
  scoredStations: state.station.scoredStations,
  leftStations: state.navigation.leftStations,
  badAccuracy: state.location.badAccuracy,
  selectedDirection: state.station.selectedDirection,
  selectedBound: state.station.selectedBound,
  selectedLine: state.line.selectedLine,
});

const mapDispatchToProps = (
  dispatch: Dispatch<unknown>
): {
  updateSelectedBound: (station: Station) => void;
  updateSelectedDirection: (direction: LineDirection) => void;
} => ({
  updateSelectedBound: (station: Station): void =>
    dispatch(updateSelectedBoundDispatcher(station)),
  updateSelectedDirection: (direction: LineDirection): void =>
    dispatch(updateSelectedDirectionDispatcher(direction)),
});

export default connect(mapStateToProps, mapDispatchToProps as unknown)(Layout);
