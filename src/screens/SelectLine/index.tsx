import {LocationData} from 'expo-location';
import i18n from 'i18n-js';
import React, {Dispatch} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {NavigationParams, NavigationScreenProp, NavigationState,} from 'react-navigation';
import {connect} from 'react-redux';

import Button from '../../components/Button';
import FAB from '../../components/FAB';
import {ILine, IStation} from '../../models/StationAPI';
import {AppState} from '../../store';
import {updateSelectedLine as updateSelectedLineDispatcher} from '../../store/actions/line';
import {fetchStationAsync} from '../../store/actions/stationAsync';
import {katakanaToRomaji} from '../../utils/katakanaToRomaji';

interface IProps {
  location: LocationData;
  navigation: NavigationScreenProp<NavigationState, NavigationParams>;
  station: IStation;
  updateSelectedLine: (line: ILine) => void;
  fetchStation: (location: LocationData) => Promise<void>;
}

const styles = StyleSheet.create({
  bottom: {
    padding: 24,
  },
  headingText: {
    fontSize: 24,
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
  button: {
    marginLeft: 8,
    marginRight: 8,
    marginBottom: 12,
  },
});

const SelectLineScreen = ({
                            location,
                            navigation,
                            fetchStation,
                            updateSelectedLine,
                            station,
                          }: IProps) => {
  const handleLineSelected = (line: ILine) => {
    updateSelectedLine(line);
    navigation.navigate('SelectBound');
  };

  const renderLineButton = (line: ILine) => (
    <Button
      text={i18n.locale === 'ja' ? line.name : katakanaToRomaji(line.nameK, true)}
      color={`#${line.lineColorC}`}
      key={line.id}
      style={styles.button}
      onPress={handleLineSelected.bind(this, line)}
    />
  );

  const handleForceRefresh = () => fetchStation(location);

  return (
    <>
      <ScrollView contentContainerStyle={styles.bottom}>
        <Text style={styles.headingText}>{i18n.t('selectLineTitle')}</Text>

        <View style={styles.buttons}>
          {station.lines.map((line) => renderLineButton(line))}
        </View>
      </ScrollView>
      <FAB onPress={handleForceRefresh}/>
    </>
  );
};

const mapStateToProps = (state: AppState) => ({
  location: state.location.location,
  station: state.station.station,
});

const mapDispatchToProps = (dispatch: Dispatch<any>) => ({
  updateSelectedLine: (line: ILine) =>
    dispatch(updateSelectedLineDispatcher(line)),
  fetchStation: (location: LocationData) =>
    dispatch(fetchStationAsync(location)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(SelectLineScreen);
