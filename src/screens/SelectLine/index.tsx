import React, { useEffect, useCallback } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  View,
  AsyncStorage,
  Platform,
  PlatformIOSStatic,
  ActivityIndicator,
} from 'react-native';

import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import Button from '../../components/Button';
import FAB from '../../components/FAB';
import { getLineMark } from '../../lineMark';
import { Line, LineType } from '../../models/StationAPI';
import Heading from '../../components/Heading';
import useStation from '../../hooks/useStation';
import { isJapanese, translate } from '../../translation';
import ErrorScreen from '../../components/ErrorScreen';
import stationState from '../../store/atoms/station';
import locationState from '../../store/atoms/location';
import lineState from '../../store/atoms/line';

const { isPad } = Platform as PlatformIOSStatic;

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
    marginHorizontal: isPad ? 12 : 8,
    marginBottom: isPad ? 24 : 12,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

const SelectLineScreen: React.FC = () => {
  const { station } = useRecoilValue(stationState);
  const [{ location }, setLocation] = useRecoilState(locationState);
  const setLine = useSetRecoilState(lineState);
  const [fetchStationFunc, errors] = useStation();

  useEffect(() => {
    if (location && !station) {
      fetchStationFunc(location);
    }
  }, [fetchStationFunc, location, station]);

  const showFirtLaunchWarning = async (): Promise<void> => {
    const firstLaunchPassed = await AsyncStorage.getItem(
      '@TrainLCD:firstLaunchPassed'
    );
    if (firstLaunchPassed === null) {
      Alert.alert(translate('notice'), translate('firstAlertText'), [
        {
          text: 'OK',
          onPress: async (): Promise<void> => {
            await AsyncStorage.setItem('@TrainLCD:firstLaunchPassed', 'true');
          },
        },
      ]);
    }
  };

  useEffect(() => {
    showFirtLaunchWarning();
  }, []);

  const navigation = useNavigation();

  const handleLineSelected = useCallback(
    (line: Line): void => {
      if (line.lineType === LineType.Subway) {
        Alert.alert(
          translate('subwayAlertTitle'),
          translate('subwayAlertText'),
          [{ text: 'OK' }]
        );
      }

      setLine((prev) => ({
        ...prev,
        selectedLine: line,
      }));
      navigation.navigate('SelectBound');
    },
    [navigation, setLine]
  );

  const renderLineButton: React.FC<Line> = useCallback(
    (line: Line) => {
      const lineMark = getLineMark(line);
      const buttonText = `${lineMark ? `${lineMark.sign}` : ''}${
        lineMark && lineMark.subSign ? `/${lineMark.subSign} ` : ' '
      }${isJapanese ? line.name : line.nameR}`;
      const buttonOnPress = (): void => handleLineSelected(line);
      return (
        <Button
          color={`#${line.lineColorC}`}
          key={line.id}
          style={styles.button}
          onPress={buttonOnPress}
        >
          {buttonText}
        </Button>
      );
    },
    [handleLineSelected]
  );

  const handleForceRefresh = useCallback(async (): Promise<void> => {
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    setLocation((prev) => ({
      ...prev,
      location: loc,
    }));
    fetchStationFunc(loc);
  }, [fetchStationFunc, setLocation]);

  const navigateToThemeSettingsScreen = useCallback(() => {
    navigation.navigate('ThemeSettings');
  }, [navigation]);

  const navigateToFakeStationSettingsScreen = useCallback(() => {
    navigation.navigate('FakeStation');
  }, [navigation]);

  if (errors.length) {
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
          <Button
            color="#555"
            style={styles.button}
            onPress={navigateToFakeStationSettingsScreen}
          >
            {translate('startStationTitle')}
          </Button>
          <Button
            color="#555"
            style={styles.button}
            onPress={navigateToThemeSettingsScreen}
          >
            {translate('selectThemeTitle')}
          </Button>
        </View>
      </ScrollView>
      <FAB icon="md-refresh" onPress={handleForceRefresh} />
    </>
  );
};

export default React.memo(SelectLineScreen);
