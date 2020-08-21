import i18n from 'i18n-js';
import React, { useEffect, useCallback, useState, memo } from 'react';
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

import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import Button from '../../components/Button';
import FAB from '../../components/FAB';
import { getLineMark } from '../../lineMark';
import { Line, LineType } from '../../models/StationAPI';
import Heading from '../../components/Heading';
import FakeStationSettings from '../../components/FakeStationSettings';
import getTranslatedText from '../../utils/translate';
import useStation from '../../hooks/useStation';
import { TrainLCDAppState } from '../../store';
import updateSelectedLine from '../../store/actions/line';
import { updateLocationSuccess } from '../../store/actions/location';

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
  const [selectInitialVisible, setSelectInitialVisible] = useState(false);
  const { station } = useSelector((state: TrainLCDAppState) => state.station);

  const dispatch = useDispatch();

  const [fetchStationFunc] = useStation();

  useEffect(() => {
    const f = async (): Promise<void> => {
      const loc = await Location.getCurrentPositionAsync({});
      dispatch(updateLocationSuccess(loc));
      fetchStationFunc(loc);
    };
    f();
  }, [dispatch, fetchStationFunc]);

  const showFirtLaunchWarning = async (): Promise<void> => {
    const firstLaunchPassed = await AsyncStorage.getItem(
      '@TrainLCD:firstLaunchPassed'
    );
    if (firstLaunchPassed === null) {
      Alert.alert(
        getTranslatedText('firstAlertTitle'),
        getTranslatedText('firstAlertText'),
        [
          {
            text: 'OK',
            onPress: async (): Promise<void> => {
              await AsyncStorage.setItem('@TrainLCD:firstLaunchPassed', 'true');
            },
          },
        ]
      );
    }
  };

  useEffect(() => {
    showFirtLaunchWarning();
  }, []);

  const navigation = useNavigation();

  const handleLineSelected = (line: Line): void => {
    if (line.lineType === LineType.Subway) {
      Alert.alert(
        getTranslatedText('subwayAlertTitle'),
        getTranslatedText('subwayAlertText'),
        [{ text: 'OK' }]
      );
    }

    dispatch(updateSelectedLine(line));
    navigation.navigate('SelectBound');
  };

  const renderLineButton: React.FC<Line> = (line: Line) => {
    const lineMark = getLineMark(line);
    const buttonText = `${lineMark ? `${lineMark.sign}` : ''}${
      lineMark && lineMark.subSign ? `/${lineMark.subSign} ` : ' '
    }${i18n.locale === 'ja' ? line.name : line.nameR}`;
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
  };

  const handleForceRefresh = useCallback(async (): Promise<void> => {
    const loc = await Location.getCurrentPositionAsync({});
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
        <Heading>{getTranslatedText('selectLineTitle')}</Heading>

        <View style={styles.buttons}>
          {station.lines.map((line) => renderLineButton(line))}
        </View>

        <Heading style={styles.marginTop}>
          {getTranslatedText('settingsTitle')}
        </Heading>
        <View style={styles.buttons}>
          <Button
            color="#555"
            style={styles.button}
            onPress={navigateToFakeStationSettingsScreen}
          >
            {getTranslatedText('startStationTitle')}
          </Button>
          <Button
            color="#555"
            style={styles.button}
            onPress={navigateToThemeSettingsScreen}
          >
            {getTranslatedText('selectThemeTitle')}
          </Button>
        </View>
      </ScrollView>
      <FAB onPress={handleForceRefresh} />
    </>
  );
};

export default memo(SelectLineScreen);
