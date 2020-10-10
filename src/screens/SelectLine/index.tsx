import React, { useEffect, useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  View,
  AsyncStorage,
  Platform,
  PlatformIOSStatic,
  Modal,
  ActivityIndicator,
} from 'react-native';
import DeviceInfo from 'react-native-device-info';

import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import Button from '../../components/Button';
import FAB from '../../components/FAB';
import { getLineMark } from '../../lineMark';
import { Line, LineType } from '../../models/StationAPI';
import Heading from '../../components/Heading';
import FakeStationSettings from '../../components/FakeStationSettings';
import useStation from '../../hooks/useStation';
import { TrainLCDAppState } from '../../store';
import updateSelectedLine from '../../store/actions/line';
import { updateLocationSuccess } from '../../store/actions/location';
import { isJapanese, translate } from '../../translation';

const { isTablet } = DeviceInfo;

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
  const [selectInitialVisible, setSelectInitialVisible] = useState(false);
  const { station } = useSelector((state: TrainLCDAppState) => state.station);
  const { location } = useSelector((state: TrainLCDAppState) => state.location);
  const dispatch = useDispatch();
  const [fetchStationFunc] = useStation();

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

      dispatch(updateSelectedLine(line));
      navigation.navigate('SelectBound');
    },
    [dispatch, navigation]
  );

  const renderLineButton: React.FC<Line> = useCallback(
    (line: Line) => {
      const lineMark = getLineMark(line);
      const buttonText = `${lineMark ? `${lineMark.sign}` : ''}${lineMark && lineMark.subSign ? `/${lineMark.subSign} ` : ' '
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
    dispatch(updateLocationSuccess(loc));
    fetchStationFunc(loc);
  }, [dispatch, fetchStationFunc]);

  const navigateToThemeSettingsScreen = useCallback(() => {
    navigation.navigate('ThemeSettings');
  }, [navigation]);

  const navigateToFakeStationSettingsScreen = useCallback(() => {
    setSelectInitialVisible(true);
  }, []);

  const handleRequestClose = useCallback(() => {
    setSelectInitialVisible(false);
  }, []);

  if (!station) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <>
      <Modal
        visible={selectInitialVisible}
        animationType="slide"
        supportedOrientations={['landscape']}
      >
        <FakeStationSettings onRequestClose={handleRequestClose} />
      </Modal>
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
