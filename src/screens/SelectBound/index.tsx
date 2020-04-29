import i18n from 'i18n-js';
import React, { Dispatch, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native';
import { connect } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Button from '../../components/Button';
import { directionToDirectionName, LineDirection } from '../../models/Bound';
import { Line, Station } from '../../models/StationAPI';
import { TrainLCDAppState } from '../../store';
import updateSelectedLineDispatcher from '../../store/actions/line';
import {
  updateSelectedBound as updateSelectedBoundDispatcher,
  updateSelectedDirection as updateSelectedDirectionDispatcher,
} from '../../store/actions/station';
import { fetchStationListAsync } from '../../store/actions/stationAsync';
import translations from '../../translations';
import getCurrentStationIndex from '../../utils/currentStationIndex';
import katakanaToRomaji from '../../utils/katakanaToRomaji';
import {
  inboundStationForLoopLine,
  isYamanoteLine,
  outboundStationForLoopLine,
} from '../../utils/loopLine';

i18n.translations = translations;

interface Props {
  fetchStationList: (lineId: number) => void;
  selectedLine: Line;
  stations: Station[];
  station: Station;
  updateSelectedBound: (station: Station) => void;
  updateSelectedDirection: (direction: LineDirection) => void;
  updateSelectedLine: (line: Line) => void;
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
    fontSize: 24,
  },
});

const SelectBoundScreen: React.FC<Props> = ({
  fetchStationList,
  selectedLine,
  stations,
  station,
  updateSelectedBound,
  updateSelectedDirection,
  updateSelectedLine,
}: Props) => {
  const [yamanoteLine, setYamanoteLine] = useState(false);
  const navigation = useNavigation();

  const handleSelecBoundBackButtonPress = (): void => {
    updateSelectedLine(null);
    setYamanoteLine(false);
    navigation.navigate('SelectLine');
  };

  const handler = BackHandler.addEventListener('hardwareBackPress', () => {
    handleSelecBoundBackButtonPress();
    return true;
  });

  useEffect(() => {
    fetchStationList(parseInt(selectedLine.id, 10));
    setYamanoteLine(isYamanoteLine(selectedLine.id));
    return (): void => {
      if (handler) {
        handler.remove();
      }
    };
  }, []);

  if (!stations.length) {
    return <ActivityIndicator style={styles.boundLoading} size="large" />;
  }

  const inboundStation = stations[stations.length - 1];
  const outboundStation = stations[0];

  const currentIndex = getCurrentStationIndex(stations, station);
  const inbound = inboundStationForLoopLine(
    stations,
    currentIndex,
    selectedLine
  );
  const outbound = outboundStationForLoopLine(
    stations,
    currentIndex,
    selectedLine
  );

  let computedInboundStation: Station;
  let computedOutboundStation: Station;
  if (yamanoteLine) {
    if (inbound) {
      computedInboundStation = inbound.station;
      computedOutboundStation = outboundStation;
    } else {
      computedInboundStation = inboundStation;
      computedOutboundStation = outbound.station;
    }
  } else {
    computedInboundStation = inboundStation;
    computedOutboundStation = outboundStation;
  }

  const handleBoundSelected = (
    selectedStation: Station,
    direction: LineDirection
  ): void => {
    updateSelectedBound(selectedStation);
    updateSelectedDirection(direction);
    navigation.navigate('Main');
  };

  interface RenderButtonProps {
    boundStation: Station;
    direction: LineDirection;
  }

  const renderButton: React.FC<RenderButtonProps> = ({
    boundStation,
    direction,
  }: RenderButtonProps) => {
    if (!boundStation) {
      return <></>;
    }
    if (yamanoteLine && (!inbound || !outbound)) {
      return <></>;
    }
    const directionName = directionToDirectionName(direction);
    /*
    const directionText = yamanoteLine
      ? i18n.locale === 'ja'
        ? `${directionName}(${
            direction === 'INBOUND'
              ? inbound
                ? inbound.boundFor
                : ''
              : outbound
              ? outbound.boundFor
              : ''
          }方面)`
        : `${directionName}(for ${
            direction === 'INBOUND'
              ? inbound
                ? inbound.boundFor
                : ''
              : outbound
              ? outbound.boundFor
              : ''
          })`
      : i18n.locale === 'ja'
      ? `${boundStation.name}方面`
      : `for ${katakanaToRomaji(boundStation)}`;
    */
    let directionText = '';
    if (yamanoteLine) {
      if (i18n.locale === 'ja') {
        if (direction === 'INBOUND') {
          directionText = `${directionName}(${inbound.boundFor}方面)`;
        } else {
          directionText = `${directionName}(${outbound.boundFor}方面)`;
        }
      } else if (direction === 'INBOUND') {
        directionText = `${directionName}(for ${inbound.boundFor})`;
      } else {
        directionText = `${directionName}(for ${outbound.boundFor})`;
      }
    } else if (i18n.locale === 'ja') {
      directionText = `${boundStation.name}方面`;
    } else {
      directionText = `for ${katakanaToRomaji(boundStation)}`;
    }
    const boundSelectOnPress = (): void =>
      handleBoundSelected(boundStation, direction);
    return (
      <Button
        style={styles.button}
        text={directionText}
        color="#333"
        key={boundStation.groupId}
        onPress={boundSelectOnPress}
      />
    );
  };

  const IOSShakeCaption: React.FC = () => (
    <Text style={styles.iosShakeCaption}>{i18n.t('shakeToOpenMenu')}</Text>
  );

  return (
    <View style={styles.bottom}>
      <Text style={styles.headingText}>{i18n.t('selectBoundTitle')}</Text>

      <View style={styles.buttons}>
        <View style={styles.horizonalButtons}>
          {renderButton({
            boundStation: computedInboundStation,
            direction: 'INBOUND',
          })}
          {renderButton({
            boundStation: computedOutboundStation,
            direction: 'OUTBOUND',
          })}
        </View>
        <Button
          text={i18n.t('back')}
          color="#333"
          onPress={handleSelecBoundBackButtonPress}
        />
      </View>
      {Platform.OS === 'ios' ? <IOSShakeCaption /> : null}
    </View>
  );
};

const mapStateToProps = (
  state: TrainLCDAppState
): {
  selectedLine: Line;
  stations: Station[];
  station: Station;
} => ({
  selectedLine: state.line.selectedLine,
  stations: state.station.stations,
  station: state.station.station,
});

const mapDispatchToProps = (
  dispatch: Dispatch<unknown>
): {
  fetchStationList: (lineId: number) => void;
  updateSelectedLine: (line: Line) => void;
  updateSelectedBound: (station: Station) => void;
  updateSelectedDirection: (direction: LineDirection) => void;
} => ({
  fetchStationList: (lineId: number): void =>
    dispatch(fetchStationListAsync(lineId)),
  updateSelectedLine: (line: Line): void =>
    dispatch(updateSelectedLineDispatcher(line)),
  updateSelectedBound: (station: Station): void =>
    dispatch(updateSelectedBoundDispatcher(station)),
  updateSelectedDirection: (direction: LineDirection): void =>
    dispatch(updateSelectedDirectionDispatcher(direction)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps as unknown
)(SelectBoundScreen);
