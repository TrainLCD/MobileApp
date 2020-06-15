import { LocationData } from 'expo-location';
import i18n from 'i18n-js';
import React, { Dispatch, useEffect, useCallback, useState } from 'react';
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
import { connect } from 'react-redux';

import { useNavigation } from '@react-navigation/native';
import { ThunkAction } from 'redux-thunk';
import { Action } from 'redux';
import Button from '../../components/Button';
import FAB from '../../components/FAB';
import { getLineMark } from '../../lineMark';
import { Line, Station, LineType } from '../../models/StationAPI';
import { TrainLCDAppState } from '../../store';
import updateSelectedLineDispatcher from '../../store/actions/line';
import { UpdateSelectedLineAction } from '../../store/types/line';
import { fetchStationAsync } from '../../store/actions/stationAsync';
import Heading from '../../components/Heading';
import FakeStationSettings from '../../components/FakeStationSettingsModal';

const { isPad } = Platform as PlatformIOSStatic;

interface Props {
  location: LocationData;
  station: Station;
  updateSelectedLine: (line: Line) => void;
  fetchStation: (location: LocationData) => Promise<void>;
}

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

const SelectLineScreen: React.FC<Props> = ({
  location,
  fetchStation,
  updateSelectedLine,
  station,
}: Props) => {
  const [selectInitialVisible, setSelectInitialVisible] = useState(false);

  const showFirtLaunchWarning = async (): Promise<void> => {
    const firstLaunchPassed = await AsyncStorage.getItem(
      '@TrainLCD:firstLaunchPassed'
    );
    if (firstLaunchPassed === null) {
      Alert.alert(i18n.t('firstAlertTitle'), i18n.t('firstAlertText'), [
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

  const handleLineSelected = (line: Line): void => {
    if (line.lineType === LineType.Subway) {
      Alert.alert(i18n.t('subwayAlertTitle'), i18n.t('subwayAlertText'), [
        { text: 'OK' },
      ]);
    }

    updateSelectedLine(line);
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

  const handleForceRefresh = (): Promise<void> => fetchStation(location);

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
        <Heading>{i18n.t('selectLineTitle')}</Heading>

        <View style={styles.buttons}>
          {station.lines.map((line) => renderLineButton(line))}
        </View>

        <Heading style={styles.marginTop}>{i18n.t('settingsTitle')}</Heading>
        <View style={styles.buttons}>
          <Button
            color="#555"
            style={styles.button}
            onPress={navigateToFakeStationSettingsScreen}
          >
            {i18n.t('startStationTitle')}
          </Button>
          <Button
            color="#555"
            style={styles.button}
            onPress={navigateToThemeSettingsScreen}
          >
            {i18n.t('selectThemeTitle')}
          </Button>
        </View>
      </ScrollView>
      <FAB onPress={handleForceRefresh} />
    </>
  );
};

const mapStateToProps = (
  state: TrainLCDAppState
): {
  location: LocationData;
  station: Station;
} => ({
  location: state.location.location,
  station: state.station.station,
});

const mapDispatchToProps = (
  dispatch: Dispatch<
    | UpdateSelectedLineAction
    | ThunkAction<void, TrainLCDAppState, null, Action<string>>
  >
): {
  updateSelectedLine: (line: Line) => void;
  fetchStation: (location: LocationData) => void;
} => ({
  updateSelectedLine: (line: Line): void =>
    dispatch(updateSelectedLineDispatcher(line)),
  fetchStation: (location: LocationData): void =>
    dispatch(fetchStationAsync(location)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps as unknown
)(SelectLineScreen);
