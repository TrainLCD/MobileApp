import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import React, { useCallback, useEffect } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSetRecoilState } from 'recoil';
import type { Line } from '~/gen/proto/stationapi_pb';
import Button from '../components/Button';
import ErrorScreen from '../components/ErrorScreen';
import FAB from '../components/FAB';
import Heading from '../components/Heading';
import Loading from '../components/Loading';
import {
  ASYNC_STORAGE_KEYS,
  LOCATION_TASK_NAME,
  parenthesisRegexp,
} from '../constants';
import {
  useApplicationFlagStore,
  useConnectivity,
  useCurrentStation,
  useFetchCurrentLocationOnce,
  useFetchNearbyStation,
  useGetLineMark,
  useLocationStore,
} from '../hooks';
import lineState from '../store/atoms/line';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { TestIds } from '../test/e2e';
import { isJapanese, translate } from '../translation';
import { generateLineTestId } from '../utils/generateTestID';
import { isDevApp } from '../utils/isDevApp';
import isTablet from '../utils/isTablet';

const styles = StyleSheet.create({
  rootPadding: {
    padding: 24,
  },
  marginTop: {
    marginTop: 24,
  },
  buttons: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    alignItems: 'center',
    alignSelf: 'center',
    rowGap: isTablet ? 12 : 8,
    columnGap: isTablet ? 24 : 12,
  },
});

const SelectLineScreen: React.FC = () => {
  const setStationState = useSetRecoilState(stationState);
  const setNavigationState = useSetRecoilState(navigationState);
  const setLineState = useSetRecoilState(lineState);

  const autoModeEnabled = useApplicationFlagStore(
    (state) => state.autoModeEnabled
  );
  const toggleAutoModeEnabled = useApplicationFlagStore(
    (state) => state.toggleAutoModeEnabled
  );

  const {
    fetchByCoords,
    isLoading: nearbyStationLoading,
    error: nearbyStationFetchError,
  } = useFetchNearbyStation();
  const isInternetAvailable = useConnectivity();
  const {
    fetchCurrentLocation,
    loading: locationLoading,
    error: fetchLocationError,
  } = useFetchCurrentLocationOnce();
  const station = useCurrentStation();
  const locationState = useLocationStore();

  useEffect(() => {
    const stopLocationUpdatesAsync = async () => {
      try {
        const hasStartedLocationUpdates =
          await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
        if (hasStartedLocationUpdates) {
          await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        }
      } catch (err) {
        console.error(err);
      }
    };
    stopLocationUpdatesAsync();
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    const init = async () => {
      if (station) return;
      const pos = await fetchCurrentLocation(true);
      if (!pos) {
        return;
      }
      useLocationStore.setState(pos);
      const data = await fetchByCoords({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        limit: 1,
      });
      const stationFromAPI = data.stations[0] ?? null;

      setStationState((prev) => ({
        ...prev,
        station: stationFromAPI,
      }));
      setNavigationState((prev) => ({
        ...prev,
        stationForHeader: stationFromAPI,
      }));
    };
    init();
  }, []);

  useEffect(() => {
    const f = async (): Promise<void> => {
      const firstLaunchPassed = await AsyncStorage.getItem(
        ASYNC_STORAGE_KEYS.FIRST_LAUNCH_PASSED
      );
      if (firstLaunchPassed === null) {
        Alert.alert(translate('notice'), translate('firstAlertText'), [
          {
            text: 'OK',
            onPress: (): void => {
              AsyncStorage.setItem(
                ASYNC_STORAGE_KEYS.FIRST_LAUNCH_PASSED,
                'true'
              );
            },
          },
        ]);
      }
    };
    f();
  }, []);

  const navigation = useNavigation();

  const handleLineSelected = useCallback(
    (line: Line): void => {
      setNavigationState((prev) => ({
        ...prev,
        trainType: line.station?.trainType ?? null,
        leftStations: [],
      }));
      setLineState((prev) => ({
        ...prev,
        selectedLine: line,
      }));
      navigation.navigate('SelectBound' as never);
    },
    [navigation, setLineState, setNavigationState]
  );

  const getLineMarkFunc = useGetLineMark();

  const getButtonText = useCallback(
    (line: Line) => {
      const lineMark = station && getLineMarkFunc({ line });
      const lineName = line.nameShort.replace(parenthesisRegexp, '');
      const lineNameR = line.nameRoman?.replace(parenthesisRegexp, '') ?? '';
      if (lineMark?.extraSign) {
        return `[${lineMark.sign}/${lineMark.subSign}/${lineMark.extraSign}] ${
          isJapanese ? lineName : lineNameR
        }`;
      }
      if (lineMark?.subSign) {
        return `[${lineMark.sign}/${lineMark.subSign}] ${
          isJapanese ? lineName : lineNameR
        }`;
      }
      if (lineMark?.sign) {
        return `[${lineMark.sign}] ${isJapanese ? lineName : lineNameR}`;
      }
      return isJapanese ? lineName : lineNameR;
    },
    [getLineMarkFunc, station]
  );

  const renderLineButton: React.FC<Line> = useCallback(
    (line: Line) => {
      const buttonOnPress = (): void => handleLineSelected(line);
      const buttonText = getButtonText(line);

      return (
        <Button
          color={line.color ?? '#000'}
          key={line.id}
          disabled={!isInternetAvailable}
          onPress={buttonOnPress}
          testID={generateLineTestId(line)}
        >
          {buttonText}
        </Button>
      );
    },
    [getButtonText, handleLineSelected, isInternetAvailable]
  );

  const handleUpdateStation = useCallback(async () => {
    const pos = await fetchCurrentLocation();
    if (!pos) {
      return;
    }
    const data = await fetchByCoords({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      limit: 1,
    });
    const stationFromAPI = data.stations[0] ?? null;
    setStationState((prev) => ({
      ...prev,
      station:
        prev.station?.id !== stationFromAPI?.id ? stationFromAPI : prev.station,
    }));
    setNavigationState((prev) => ({
      ...prev,
      stationForHeader:
        prev.stationForHeader?.id !== stationFromAPI?.id
          ? stationFromAPI
          : prev.stationForHeader,
    }));
  }, [
    fetchByCoords,
    fetchCurrentLocation,
    setNavigationState,
    setStationState,
  ]);

  const navigateToSettingsScreen = useCallback(() => {
    navigation.navigate('AppSettings' as never);
  }, [navigation]);

  const navigateToFakeStationSettingsScreen = useCallback(() => {
    navigation.navigate('FakeStation' as never);
  }, [navigation]);

  const navigateToSavedRoutesScreen = useCallback(() => {
    navigation.navigate('SavedRoutes' as never);
  }, [navigation]);

  const navigateToRouteSearchScreen = useCallback(() => {
    navigation.navigate('RouteSearch' as never);
  }, [navigation]);

  if (nearbyStationFetchError) {
    return (
      <ErrorScreen
        showStatus
        title={translate('errorTitle')}
        text={translate('apiErrorText')}
        onRetryPress={handleUpdateStation}
        isFetching={nearbyStationLoading}
      />
    );
  }

  if (fetchLocationError && !station) {
    return (
      <ErrorScreen
        showSearchStation
        title={translate('errorTitle')}
        text={translate('couldNotGetLocation')}
        onRetryPress={handleUpdateStation}
        isFetching={locationLoading}
      />
    );
  }

  // NOTE: 駅検索ができるボタンが表示されるので、!stationがないと一生loadingになる
  if (!locationState && !station) {
    return (
      <Loading
        message={translate('loadingLocation')}
        linkType="searchStation"
      />
    );
  }

  if (!station) {
    return (
      <Loading message={translate('loadingAPI')} linkType="serverStatus" />
    );
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.rootPadding}>
        <Heading>{translate('selectLineTitle')}</Heading>

        <View style={styles.buttons}>
          {station.lines.map((l) => renderLineButton(l))}
        </View>

        <Heading style={styles.marginTop}>{translate('settings')}</Heading>
        <View style={styles.buttons}>
          {isInternetAvailable ? (
            <>
              <Button
                onPress={navigateToFakeStationSettingsScreen}
                testID={TestIds.Button.FakeStationSettings}
              >
                {translate('searchFirstStationTitle')}
              </Button>
              {isInternetAvailable && isDevApp && (
                <Button onPress={navigateToSavedRoutesScreen}>
                  {translate('savedRoutes')}
                </Button>
              )}
              <Button onPress={navigateToRouteSearchScreen}>
                {translate('routeSearchTitle')}
              </Button>
            </>
          ) : null}
          <Button onPress={toggleAutoModeEnabled}>
            {translate('autoModeSettings')}: {autoModeEnabled ? 'ON' : 'OFF'}
          </Button>

          <Button onPress={navigateToSettingsScreen}>
            {translate('settings')}
          </Button>
        </View>
      </ScrollView>
      <FAB
        disabled={!isInternetAvailable || locationLoading}
        icon="refresh"
        onPress={handleUpdateStation}
      />
    </>
  );
};

export default React.memo(SelectLineScreen);
