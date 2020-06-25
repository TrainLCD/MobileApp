import i18n from 'i18n-js';
import React, { useEffect, useCallback, useState, memo, Dispatch } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  View,
  AsyncStorage,
  Platform,
  PlatformIOSStatic,
  Modal,
} from 'react-native';

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
import { StationActionTypes } from '../../store/types/station';
import updateSelectedLine from '../../store/actions/line';
import { LineActionTypes } from '../../store/types/line';

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
});

const SelectLineScreen: React.FC = () => {
  const [selectInitialVisible, setSelectInitialVisible] = useState(false);
  const { station } = useSelector((state: TrainLCDAppState) => state.station);
  const { location } = useSelector((state: TrainLCDAppState) => state.location);
  const dispatch = useDispatch<
    Dispatch<StationActionTypes | LineActionTypes>
  >();

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

  const [fetchStationFunc] = useStation();
  const handleForceRefresh = (): Promise<void> => fetchStationFunc(location);

  const navigateToThemeSettingsScreen = useCallback(() => {
    navigation.navigate('ThemeSettings');
  }, [navigation]);

  const navigateToFakeStationSettingsScreen = useCallback(() => {
    setSelectInitialVisible(true);
  }, []);

  const handleRequestClose = useCallback(() => {
    setSelectInitialVisible(false);
  }, []);

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
