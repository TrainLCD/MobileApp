import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import React, { useCallback, useEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useRecoilState, useRecoilValue } from 'recoil';
import Button from '../components/Button';
import ErrorScreen from '../components/ErrorScreen';
import FAB from '../components/FAB';
import Heading from '../components/Heading';
import { LOCATION_TASK_NAME } from '../constants/location';
import { parenthesisRegexp } from '../constants/regexp';
import useConnectivity from '../hooks/useConnectivity';
import useFetchNearbyStation from '../hooks/useFetchNearbyStation';
import useGetLineMark from '../hooks/useGetLineMark';
import { Line } from '../models/StationAPI';
import devState from '../store/atoms/dev';
import lineState from '../store/atoms/line';
import locationState from '../store/atoms/location';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { isJapanese, translate } from '../translation';
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
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  button: {
    marginHorizontal: isTablet ? 12 : 8,
    marginBottom: isTablet ? 24 : 12,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

const SelectLineScreen: React.FC = () => {
  const [{ station }, setStation] = useRecoilState(stationState);
  const [{ location }, setLocation] = useRecoilState(locationState);
  const [{ requiredPermissionGranted }, setNavigation] =
    useRecoilState(navigationState);
  const [{ prevSelectedLine }, setLine] = useRecoilState(lineState);
  const { devMode } = useRecoilValue(devState);
  const [fetchStationFunc, , fetchStationError] = useFetchNearbyStation();
  const isInternetAvailable = useConnectivity();

  useEffect(() => {
    Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchStationFunc(location as Location.LocationObject);
    }, [fetchStationFunc, location])
  );

  const navigation = useNavigation();

  const handleLineSelected = useCallback(
    (line: Line): void => {
      if (isInternetAvailable) {
        setStation((prev) => ({
          ...prev,
          stations: [],
          stationsWithTrainTypes: [],
        }));
        setNavigation((prev) => ({
          ...prev,
          trainType: null,
        }));
      }

      setLine((prev) => ({
        ...prev,
        selectedLine: line,
        prevSelectedLine: line,
      }));
      navigation.navigate('SelectBound');
    },
    [isInternetAvailable, navigation, setLine, setNavigation, setStation]
  );

  const getLineMarkFunc = useGetLineMark();

  const getButtonText = useCallback(
    (line: Line) => {
      const lineMark = station && getLineMarkFunc(station, line);
      const lineName = line.name.replace(parenthesisRegexp, '');
      const lineNameR = line.nameR.replace(parenthesisRegexp, '');
      if (lineMark?.sign && lineMark?.subSign) {
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
      const isLineCached = prevSelectedLine?.id === line.id;
      const buttonText = getButtonText(line);

      return (
        <Button
          color={`#${line.lineColorC}`}
          key={line.id}
          disabled={!isInternetAvailable && !isLineCached}
          style={styles.button}
          onPress={buttonOnPress}
        >
          {buttonText}
        </Button>
      );
    },
    [
      getButtonText,
      handleLineSelected,
      isInternetAvailable,
      prevSelectedLine?.id,
    ]
  );

  const handleForceRefresh = useCallback(async (): Promise<void> => {
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    setLocation((prev) => ({
      ...prev,
      location: loc,
    }));
    setStation((prev) => ({
      ...prev,
      station: null,
    }));
    setNavigation((prev) => ({
      ...prev,
      stationForHeader: null,
    }));
  }, [setLocation, setNavigation, setStation]);

  const navigateToSettingsScreen = useCallback(() => {
    navigation.navigate('AppSettings');
  }, [navigation]);

  const navigateToFakeStationSettingsScreen = useCallback(() => {
    if (isInternetAvailable) {
      navigation.navigate('FakeStation');
    }
  }, [isInternetAvailable, navigation]);
  const navigateToConnectMirroringShareScreen = useCallback(() => {
    if (isInternetAvailable) {
      navigation.navigate('ConnectMirroringShare');
    }
  }, [isInternetAvailable, navigation]);

  const navigateToDumpGPXScreen = useCallback(() => {
    navigation.navigate('DumpedGPX');
  }, [navigation]);

  if (fetchStationError) {
    return (
      <ErrorScreen
        title={translate('errorTitle')}
        text={translate('apiErrorText')}
        onRetryPress={handleForceRefresh}
      />
    );
  }

  if (!station) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#555" />
      </View>
    );
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.rootPadding}>
        <Heading>{translate('selectLineTitle')}</Heading>

        <View style={styles.buttons}>
          {station.lines.map((line) => renderLineButton(line))}
        </View>

        <Heading style={styles.marginTop}>{translate('settings')}</Heading>
        <View style={styles.buttons}>
          {isInternetAvailable ? (
            <Button
              color="#555"
              style={styles.button}
              onPress={navigateToFakeStationSettingsScreen}
            >
              {translate('startStationTitle')}
            </Button>
          ) : null}
          {isInternetAvailable && devMode && (
            <Button
              color="#555"
              style={styles.button}
              onPress={navigateToConnectMirroringShareScreen}
            >
              {translate('msConnectTitle')}
            </Button>
          )}
          <Button
            color="#555"
            style={styles.button}
            onPress={navigateToSettingsScreen}
          >
            {translate('settings')}
          </Button>
          {devMode ? (
            <Button
              color="#555"
              style={styles.button}
              onPress={navigateToDumpGPXScreen}
            >
              {translate('dumpGPXSettings')}
            </Button>
          ) : null}
        </View>
      </ScrollView>
      {requiredPermissionGranted ? (
        <FAB
          disabled={!isInternetAvailable}
          icon="md-refresh"
          onPress={handleForceRefresh}
        />
      ) : null}
    </>
  );
};

export default SelectLineScreen;
