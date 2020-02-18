import {Platform} from '@unimodules/core';
import * as Localization from 'expo-localization';
import i18n from 'i18n-js';
import React, {Dispatch, useEffect, useState} from 'react';
import {ActivityIndicator, BackHandler, StyleSheet, Text, View,} from 'react-native';
import {NavigationParams, NavigationScreenProp, NavigationState,} from 'react-navigation';
import {connect} from 'react-redux';
import Button from '../../components/Button';
import {translations} from '../../translations';
import {directionToDirectionName, LineDirection} from '../../models/Bound';
import {ILine, IStation} from '../../models/StationAPI';
import {AppState} from '../../store';
import {updateSelectedLine as updateSelectedLineDispatcher} from '../../store/actions/line';
import {
  updateSelectedBound as updateSelectedBoundDispatcher,
  updateSelectedDirection as updateSelectedDirectionDispatcher,
} from '../../store/actions/station';
import {fetchStationListAsync} from '../../store/actions/stationAsync';
import {getCurrentStationIndex} from '../../utils/currentStationIndex';
import {katakanaToRomaji} from '../../utils/katakanaToRomaji';
import {isLoopLine, isYamanoteLine} from '../../utils/loopLine';

i18n.translations = translations;

interface IProps {
  navigation: NavigationScreenProp<NavigationState, NavigationParams>;
  fetchStationList: (lineId: number) => void;
  selectedLine: ILine;
  stations: IStation[];
  station: IStation;
  updateSelectedBound: (station: IStation) => void;
  updateSelectedDirection: (direction: LineDirection) => void;
  updateSelectedLine: (line: ILine) => void;
}

const styles = StyleSheet.create({
  boundLoading: {
    marginTop: 24,
  },
  bottom: {
    flex: 1,
    alignItems: 'center',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    marginLeft: 8,
    marginRight: 8,
  },
  horizonalButtons: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  iosShakeCaption: {
    fontWeight: 'bold',
    marginTop: 24,
    color: '#555',
  },
});

const SelectBoundScreen = ({
                             navigation,
                             fetchStationList,
                             selectedLine,
                             stations,
                             station,
                             updateSelectedBound,
                             updateSelectedDirection,
                             updateSelectedLine,
                           }: IProps) => {
  const [loopLine, setLoopLine] = useState(false);

  const handler = BackHandler.addEventListener('hardwareBackPress', () => {
    handleSelecBoundBackButtonPress();
    return true;
  });

  useEffect(() => {
    fetchStationList(parseInt(selectedLine.id, 10));
    setLoopLine(isLoopLine(selectedLine));
    return () => {
      if (handler) {
        handler.remove();
      }
    };
  }, []);

  if (!stations.length) {
    return <ActivityIndicator style={styles.boundLoading} size='large'/>;
  }

  const inboundStation = stations[stations.length - 1];
  const outboundStation = stations[0];

  const yamanoteLineDetectDirection = (s: IStation) => {
    if (s.name === '新宿' || s.name === '渋谷') {
      return i18n.t('shibuyaAndShinjuku');
    }
    if (s.name === '東京' || s.name === '上野') {
      return i18n.t('uenoAndTokyo');
    }
  };

  const osakaLoopLineDirection = (s: IStation) => {
    if (s.name === '西九条' || s.name === '弁天町') {
      return i18n.t('nishikujoAndBentencho');
    }
    if (s.name === '大阪' || s.name === '京橋') {
      return i18n.t('osakaAndKyobashi');
    }
  };

  const inboundStationForLoopLine = () => {
    const maybeIndex = getCurrentStationIndex(stations, station) - 4;
    const fallbackIndex = stations.length - 1 - 7;
    const index =
      maybeIndex < 0 || maybeIndex > stations.length - 1
        ? fallbackIndex
        : maybeIndex;
    const stationsLength = stations.length;
    const leftHandStations = stations.slice(0, stationsLength / 4);
    const rightHandStations = stations.slice(stationsLength / 4);
    const found: string[] = [];
    let boundFor: string;
    
    if (selectedLine && isYamanoteLine(selectedLine.id)) {
      const mappedLeftHandStations = leftHandStations.map((s) => yamanoteLineDetectDirection(s));
      const mappedRightHandStations = rightHandStations.map((s) => yamanoteLineDetectDirection(s));
      mappedLeftHandStations.forEach((d, i) => {
        if (d) {
          found[i] = d;
        }
      });
      mappedRightHandStations.forEach((d, i) => {
        if (d) {
          found[i] = d;
        }
      });

      Object.keys(found).forEach((i) => {
        if (!boundFor) {
          boundFor = found[i];
        }
      });
      return {station: stations[index], boundFor};
    }
    return {station: stations[index], boundFor: stations[index].name};
  };
  const outboundStationForLoopline = () => {
    const maybeIndex = getCurrentStationIndex(stations, station) + 4;
    const fallbackIndex = Math.floor((stations.length - 1) / 4);
    const index =
      maybeIndex < 0 || maybeIndex > stations.length - 1
        ? fallbackIndex
        : maybeIndex;
    const stationsLength = stations.length;
    const reversedStations = stations.slice().reverse();
    const leftHandStations = reversedStations.slice(0, stationsLength / 4);
    const rightHandStations = reversedStations.slice(stationsLength / 4);
    const found: string[] = [];
    let boundFor: string;

    if (selectedLine && isYamanoteLine(selectedLine.id)) {
      const mappedLeftHandStations = leftHandStations.map((s) => yamanoteLineDetectDirection(s));
      const mappedRightHandStations = rightHandStations.map((s) => yamanoteLineDetectDirection(s));
      mappedLeftHandStations.forEach((d, i) => {
        if (d) {
          found[i] = d;
        }
      });
      mappedRightHandStations.forEach((d, i) => {
        if (d) {
          found[i] = d;
        }
      });

      Object.keys(found).forEach((i) => {
        if (!boundFor) {
          boundFor = found[i];
        }
      });
      return {station: stations[index], boundFor};
    }
    return {station: stations[index], boundFor: stations[index].name};
  };

  const computedInboundStation = loopLine
    ? inboundStationForLoopLine().station
    : inboundStation;
  const computedOutboundStation = loopLine
    ? outboundStationForLoopline().station
    : outboundStation;

  const handleBoundSelected = (
    selectedStation: IStation,
    direction: LineDirection,
  ) => {
    updateSelectedBound(selectedStation);
    updateSelectedDirection(direction);
    navigation.navigate('Main');
  };

  const handleSelecBoundBackButtonPress = () => {
    updateSelectedLine(null);
    setLoopLine(false);
    navigation.navigate('SelectLine');
  };

  const renderButton = (boundStation: IStation, direction: LineDirection) => {
    if (!boundStation) {
      return;
    }
    const directionName = directionToDirectionName(direction);
    const directionText = loopLine
      ? i18n.locale === 'ja'
        ? `${directionName}(${direction === 'INBOUND' ? inboundStationForLoopLine().boundFor : outboundStationForLoopline().boundFor}方面)`
        : `${directionName}(for ${direction === 'INBOUND' ? inboundStationForLoopLine().boundFor : outboundStationForLoopline().boundFor})`
      : i18n.locale === 'ja'
        ? `${boundStation.name}方面`
        : `for ${katakanaToRomaji(boundStation.nameK)}`;
    return (
      <Button
        style={styles.button}
        text={directionText}
        color='#333'
        key={boundStation.groupId}
        onPress={handleBoundSelected.bind(this, boundStation, direction)}
      />
    );
  };

  const IOSShakeCaption = () => (
    <Text style={styles.iosShakeCaption}>
      {i18n.t('shakeToOpenMenu')}
    </Text>
  );

  return (
    <View style={styles.bottom}>
      <Text style={styles.headingText}>{i18n.t('selectBoundTitle')}</Text>

      <View style={styles.buttons}>
        <View style={styles.horizonalButtons}>
          {renderButton(computedInboundStation, 'INBOUND')}
          {renderButton(computedOutboundStation, 'OUTBOUND')}
        </View>
        <Button
          text='戻る'
          color='#333'
          onPress={handleSelecBoundBackButtonPress}
        />
      </View>
      {Platform.OS === 'ios' ? <IOSShakeCaption/> : null}
    </View>
  );
};

const mapStateToProps = (state: AppState) => ({
  selectedLine: state.line.selectedLine,
  stations: state.station.stations,
  station: state.station.station,
});

const mapDispatchToProps = (dispatch: Dispatch<any>) => ({
  fetchStationList: (lineId: number) => dispatch(fetchStationListAsync(lineId)),
  updateSelectedLine: (line: ILine) =>
    dispatch(updateSelectedLineDispatcher(line)),
  updateSelectedBound: (station: IStation) =>
    dispatch(updateSelectedBoundDispatcher(station)),
  updateSelectedDirection: (direction: LineDirection) =>
    dispatch(updateSelectedDirectionDispatcher(direction)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(SelectBoundScreen);
