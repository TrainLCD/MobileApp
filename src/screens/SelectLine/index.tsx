import { LocationData } from 'expo-location';
import i18n from 'i18n-js';
import React, { Dispatch, useEffect, useCallback } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
  AsyncStorage,
  Platform,
  PlatformIOSStatic,
  Picker,
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
import updateAppThemeAction from '../../store/actions/theme';
import { AppTheme, UpdateThemeActionAction } from '../../store/types/theme';

const { isPad } = Platform as PlatformIOSStatic;

interface Props {
  location: LocationData;
  station: Station;
  updateSelectedLine: (line: Line) => void;
  fetchStation: (location: LocationData) => Promise<void>;
  updateAppTheme: (theme: AppTheme) => void;
  theme: AppTheme;
}

const styles = StyleSheet.create({
  bottom: {
    padding: 24,
  },
  headingText: {
    fontSize: isPad ? 32 : 24,
    fontWeight: 'bold',
    color: '#555',
    textAlign: 'center',
  },
  buttons: {
    marginTop: 12,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  themePicker: {
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
  updateAppTheme,
  theme,
}: Props) => {
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
        text={buttonText}
        color={`#${line.lineColorC}`}
        key={line.id}
        style={styles.button}
        onPress={buttonOnPress}
      />
    );
  };

  const handleForceRefresh = (): Promise<void> => fetchStation(location);
  const onThemeValueChange = useCallback(
    (v: AppTheme): void => updateAppTheme(v),
    [updateAppTheme]
  );

  return (
    <>
      <ScrollView contentContainerStyle={styles.bottom}>
        <Text style={styles.headingText}>{i18n.t('selectLineTitle')}</Text>

        <View style={styles.buttons}>
          {station.lines.map((line) => renderLineButton(line))}
        </View>

        <Text style={styles.headingText}>{i18n.t('selectThemeTitle')}</Text>
        <View style={styles.themePicker}>
          <Picker
            selectedValue={theme}
            style={{
              height: 50,
              width: '50%',
            }}
            onValueChange={onThemeValueChange}
          >
            <Picker.Item label="東京メトロ風" value={AppTheme.TokyoMetro} />
            <Picker.Item label="JR山手線風" value={AppTheme.Yamanote} />
            <Picker.Item label="JR西日本風" value={AppTheme.JRWest} />
          </Picker>
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
  theme: AppTheme;
} => ({
  location: state.location.location,
  station: state.station.station,
  theme: state.theme.theme,
});

const mapDispatchToProps = (
  dispatch: Dispatch<
    | UpdateSelectedLineAction
    | UpdateThemeActionAction
    | ThunkAction<void, TrainLCDAppState, null, Action<string>>
  >
): {
  updateSelectedLine: (line: Line) => void;
  fetchStation: (location: LocationData) => void;
  updateAppTheme: (theme: AppTheme) => void;
} => ({
  updateSelectedLine: (line: Line): void =>
    dispatch(updateSelectedLineDispatcher(line)),
  fetchStation: (location: LocationData): void =>
    dispatch(fetchStationAsync(location)),
  updateAppTheme: (theme: AppTheme): void =>
    dispatch(updateAppThemeAction(theme)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps as unknown
)(SelectLineScreen);
