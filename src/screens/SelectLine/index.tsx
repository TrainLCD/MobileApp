import AsyncStorage from '@react-native-async-storage/async-storage';
import analytics from '@react-native-firebase/analytics';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRecoilState, useSetRecoilState } from 'recoil';
import Button from '../../components/Button';
import ErrorScreen from '../../components/ErrorScreen';
import FAB from '../../components/FAB';
import Heading from '../../components/Heading';
import AsyncStorageKeys from '../../constants/asyncStorageKeys';
import useConnectivity from '../../hooks/useConnectivity';
import useNearbyStations from '../../hooks/useNearbyStations';
import { getLineMark } from '../../lineMark';
import { Line, LineType } from '../../models/StationAPI';
import lineState from '../../store/atoms/line';
import locationState from '../../store/atoms/location';
import navigationState from '../../store/atoms/navigation';
import stationState from '../../store/atoms/station';
import { isJapanese, translate } from '../../translation';
import isTablet from '../../utils/isTablet';

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
  const setNavigation = useSetRecoilState(navigationState);
  const [{ prevSelectedLine }, setLine] = useRecoilState(lineState);
  const [fetchStationFunc, apiLoading, fetchStationError] = useNearbyStations();
  const [loading, setLoading] = useState(false);
  const isInternetAvailable = useConnectivity();

  useEffect(() => {
    if (location && !station && isInternetAvailable) {
      fetchStationFunc(location as Location.LocationObject);
    }
  }, [fetchStationFunc, isInternetAvailable, location, station]);

  const navigation = useNavigation();

  useEffect(() => {
    const f = async (): Promise<void> => {
      const firstOpenPassed = await AsyncStorage.getItem(
        AsyncStorageKeys.ServiceSuspend
      );
      if (firstOpenPassed === null) {
        Alert.alert(
          translate('serviceSuspendTitle'),
          translate('serviceSuspendText'),
          [
            {
              text: translate('dontShowAgain'),
              style: 'cancel',
              onPress: async (): Promise<void> => {
                await AsyncStorage.setItem(
                  AsyncStorageKeys.ServiceSuspend,
                  'true'
                );
              },
            },
            {
              text: 'OK',
            },
          ]
        );
      }
    };
    f();
  }, []);

  const handleLineSelected = useCallback(
    async (line: Line): Promise<void> => {
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

      if (line.lineType === LineType.Subway) {
        Alert.alert(
          translate('subwayAlertTitle'),
          translate('subwayAlertText'),
          [{ text: 'OK' }]
        );
      }

      await analytics().logEvent('lineSelected', {
        id: line.id.toString(),
        name: line.name,
      });

      setLine((prev) => ({
        ...prev,
        selectedLine: line,
        prevSelectedLine: line,
      }));
      navigation.navigate('SelectBound');
    },
    [isInternetAvailable, navigation, setLine, setNavigation, setStation]
  );

  const renderLineButton: React.FC<Line> = useCallback(
    (line: Line) => {
      const lineMark = getLineMark(line);
      const buttonText = (() => {
        if (lineMark?.sign && lineMark?.subSign) {
          return `[${lineMark.sign}/${lineMark.subSign}] ${
            isJapanese ? line.name : line.nameR
          }`;
        }
        if (lineMark?.sign) {
          return `[${lineMark.sign}] ${isJapanese ? line.name : line.nameR}`;
        }
        return isJapanese ? line.name : line.nameR;
      })();
      const buttonOnPress = (): Promise<void> => handleLineSelected(line);
      const isLineCached = prevSelectedLine?.id === line.id;

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
    [handleLineSelected, isInternetAvailable, prevSelectedLine?.id]
  );

  const handleForceRefresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    setLocation((prev) => ({
      ...prev,
      location: loc,
    }));
    fetchStationFunc(loc);
    if (!apiLoading) {
      setLoading(apiLoading);
    }
  }, [apiLoading, fetchStationFunc, setLocation]);

  const navigateToSettingsScreen = useCallback(() => {
    navigation.navigate('AppSettings');
  }, [navigation]);

  const navigateToFakeStationSettingsScreen = useCallback(() => {
    if (isInternetAvailable) {
      navigation.navigate('FakeStation');
    }
  }, [isInternetAvailable, navigation]);

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
          <Button
            color="#555"
            style={styles.button}
            onPress={navigateToSettingsScreen}
          >
            {translate('settings')}
          </Button>
        </View>
      </ScrollView>
      <FAB
        disabled={loading || !isInternetAvailable}
        icon="md-refresh"
        onPress={handleForceRefresh}
      />
    </>
  );
};

export default SelectLineScreen;
