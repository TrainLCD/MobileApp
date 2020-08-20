import React, { useEffect, useState, memo } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import { useSelector, useDispatch } from 'react-redux';
import * as TaskManager from 'expo-task-manager';
import { LocationData } from 'expo-location';
import * as BackgroundFetch from 'expo-background-fetch';
import { updateLocationSuccess } from '../../store/actions/location';
import Header from '../Header';
import WarningPanel from '../WarningPanel';
import DevOverlay from '../DevOverlay';
import getTranslatedText from '../../utils/translate';
import useWatchLocation from '../../hooks/useWatchLocation';
import useStation from '../../hooks/useStation';
import { TrainLCDAppState } from '../../store';
import useDetectBadAccuracy from '../../hooks/useDetectBadAccuracy';
import { LOCATION_TASK_NAME } from '../../constants';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
let globalSetBGLocation = (location: LocationData): void => undefined;

const isLocationTaskDefined = TaskManager.isTaskDefined(LOCATION_TASK_NAME);
if (!isLocationTaskDefined) {
  TaskManager.defineTask(
    LOCATION_TASK_NAME,
    ({ data, error }): BackgroundFetch.Result => {
      if (error) {
        return BackgroundFetch.Result.Failed;
      }
      const { locations } = data as { locations: LocationData[] };
      if (locations[0]) {
        globalSetBGLocation(locations[0]);
        return BackgroundFetch.Result.NewData;
      }
      return BackgroundFetch.Result.NoData;
    }
  );
}

const shouldShowDevOverlay = Constants.manifest
  ? !Constants.manifest.releaseChannel ||
    Constants.manifest.releaseChannel === 'default'
  : false;

const styles = StyleSheet.create({
  root: {
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

type Props = {
  children: React.ReactNode;
};

const Layout: React.FC<Props> = ({ children }: Props) => {
  const [warningDismissed, setWarningDismissed] = useState(false);
  const [windowHeight, setWindowHeight] = useState(
    Dimensions.get('window').height
  );
  const { station, stations, selectedDirection, selectedBound } = useSelector(
    (state: TrainLCDAppState) => state.station
  );
  const { selectedLine } = useSelector((state: TrainLCDAppState) => state.line);
  const { location, badAccuracy } = useSelector(
    (state: TrainLCDAppState) => state.location
  );
  const { headerState, leftStations } = useSelector(
    (state: TrainLCDAppState) => state.navigation
  );

  const [bgLocation, setBGLocation] = useState<LocationData>();
  const dispatch = useDispatch();
  globalSetBGLocation = setBGLocation;

  useEffect(() => {
    if (bgLocation) {
      dispatch(updateLocationSuccess(bgLocation));
    }
  }, [bgLocation, dispatch]);

  const rootExtraStyle = {
    height: windowHeight,
  };

  const onLayout = (): void => {
    setWindowHeight(Dimensions.get('window').height);
  };

  const [watchLocationError] = useWatchLocation();
  useDetectBadAccuracy();
  const [fetchStationFunc, fetchStationsErrors] = useStation();

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
    if (badAccuracy) {
      return getTranslatedText('badAccuracy');
    }
    if (watchLocationError) {
      return getTranslatedText('couldNotGetLocation');
    }
    if (fetchStationsErrors?.length) {
      return getTranslatedText('failedToFetchStation');
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
    <View style={[styles.root, rootExtraStyle]}>
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

export default memo(Layout);
