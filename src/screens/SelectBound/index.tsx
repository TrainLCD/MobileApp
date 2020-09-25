import i18n from 'i18n-js';
import React, { Dispatch, useEffect, useState, memo } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Button from '../../components/Button';
import { directionToDirectionName, LineDirection } from '../../models/Bound';
import { Station } from '../../models/StationAPI';
import { TrainLCDAppState } from '../../store';
import getCurrentStationIndex from '../../utils/currentStationIndex';
import {
  inboundStationForLoopLine,
  isYamanoteLine,
  outboundStationForLoopLine,
  isOsakaLoopLine,
} from '../../utils/loopLine';
import Heading from '../../components/Heading';
import getTranslatedText from '../../utils/translate';
import useStationList from '../../hooks/useStationList';
import { LineActionTypes } from '../../store/types/line';
import updateSelectedLine from '../../store/actions/line';
import {
  updateSelectedBound,
  updateSelectedDirection,
} from '../../store/actions/station';
import { StationActionTypes } from '../../store/types/station';

const styles = StyleSheet.create({
  boundLoading: {
    marginTop: 24,
  },
  bottom: {
    flex: 1,
    alignItems: 'center',
    padding: 24,
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
    marginTop: 12,
    color: '#555',
    fontSize: 24,
  },
});

const SelectBoundScreen: React.FC = () => {
  const [yamanoteLine, setYamanoteLine] = useState(false);
  const [osakaLoopLine, setOsakaLoopLine] = useState(false);
  const navigation = useNavigation();
  const dispatch = useDispatch<
    Dispatch<LineActionTypes | StationActionTypes>
  >();
  const { station, stations } = useSelector(
    (state: TrainLCDAppState) => state.station
  );
  const { selectedLine } = useSelector((state: TrainLCDAppState) => state.line);

  const handleSelectBoundBackButtonPress = (): void => {
    dispatch(updateSelectedLine(null));
    setYamanoteLine(false);
    setOsakaLoopLine(false);
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const handleNotificationButtonPress = (): void => {
    navigation.navigate('Notification');
  };

  const handler = BackHandler.addEventListener('hardwareBackPress', () => {
    handleSelectBoundBackButtonPress();
    return true;
  });

  const currentIndex = getCurrentStationIndex(stations, station);
  const [fetchStationListFunc] = useStationList(parseInt(selectedLine?.id, 10));

  useEffect(() => {
    fetchStationListFunc();
    setYamanoteLine(isYamanoteLine(selectedLine?.id));
    setOsakaLoopLine(isOsakaLoopLine(selectedLine?.id));
    return (): void => {
      if (handler) {
        handler.remove();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!stations.length) {
    return <ActivityIndicator style={styles.boundLoading} size="large" />;
  }

  const inboundStation = stations[stations.length - 1];
  const outboundStation = stations[0];

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
    } else if (outbound) {
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
    dispatch(updateSelectedBound(selectedStation));
    dispatch(updateSelectedDirection(direction));
    navigation.navigate('Main');
  };

  interface RenderButtonProps {
    boundStation: Station;
    direction: LineDirection;
  }

  const isLoopLine = yamanoteLine || osakaLoopLine;

  const renderButton: React.FC<RenderButtonProps> = ({
    boundStation,
    direction,
  }: RenderButtonProps) => {
    if (!boundStation) {
      return <></>;
    }
    if (isLoopLine) {
      if (!inbound || !outbound) {
        return <></>;
      }
    } else if (direction === 'INBOUND') {
      if (currentIndex === stations.length - 1) {
        return <></>;
      }
    } else if (direction === 'OUTBOUND') {
      if (!currentIndex) {
        return <></>;
      }
    }
    const directionName = directionToDirectionName(direction);
    let directionText = '';
    if (isLoopLine) {
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
      directionText = `for ${boundStation.nameR}`;
    }
    const boundSelectOnPress = (): void =>
      handleBoundSelected(boundStation, direction);
    return (
      <Button
        style={styles.button}
        color="#333"
        key={boundStation.groupId}
        onPress={boundSelectOnPress}
      >
        {directionText}
      </Button>
    );
  };

  const IOSShakeCaption: React.FC = () => (
    <Text style={styles.iosShakeCaption}>
      {getTranslatedText('shakeToOpenMenu')}
    </Text>
  );

  return (
    <View style={styles.bottom}>
      <Heading>{getTranslatedText('selectBoundTitle')}</Heading>

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
        <Button color="#333" onPress={handleSelectBoundBackButtonPress}>
          {getTranslatedText('back')}
        </Button>
      </View>
      {Platform.OS === 'ios' ? <IOSShakeCaption /> : null}
      <Button
        style={{ marginTop: 12 }}
        color="#555"
        onPress={handleNotificationButtonPress}
      >
        {getTranslatedText('notifySettings')}
      </Button>
    </View>
  );
};

export default memo(SelectBoundScreen);
