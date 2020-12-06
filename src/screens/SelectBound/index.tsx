import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useRecoilState } from 'recoil';
import Button from '../../components/Button';
import { directionToDirectionName, LineDirection } from '../../models/Bound';
import { Station } from '../../models/StationAPI';
import getCurrentStationIndex from '../../utils/currentStationIndex';
import {
  inboundStationForLoopLine,
  isYamanoteLine,
  outboundStationForLoopLine,
  isOsakaLoopLine,
} from '../../utils/loopLine';
import Heading from '../../components/Heading';
import useStationList from '../../hooks/useStationList';
import { isJapanese, translate } from '../../translation';
import ErrorScreen from '../../components/ErrorScreen';
import stationState from '../../store/atoms/station';
import lineState from '../../store/atoms/line';

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
  horizontalButtons: {
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
  const [{ station, stations }, setStation] = useRecoilState(stationState);
  const [{ selectedLine }, setLine] = useRecoilState(lineState);
  const currentIndex = getCurrentStationIndex(stations, station);
  const [fetchStationListFunc, errors] = useStationList(selectedLine?.id);
  const isLoopLine = yamanoteLine || osakaLoopLine;
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

  const handleSelectBoundBackButtonPress = useCallback((): void => {
    setLine((prev) => ({
      ...prev,
      selectedLine: null,
    }));
    setStation((prev) => ({
      ...prev,
      stations: [],
    }));
    setYamanoteLine(false);
    setOsakaLoopLine(false);
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation, setLine, setStation]);

  const handleBoundSelected = useCallback(
    (selectedStation: Station, direction: LineDirection): void => {
      setStation((prev) => ({
        ...prev,
        selectedBound: selectedStation,
        selectedDirection: direction,
      }));
      navigation.navigate('Main');
    },
    [navigation, setStation]
  );

  const handleNotificationButtonPress = useCallback((): void => {
    navigation.navigate('Notification');
  }, [navigation]);

  const renderButton: React.FC<RenderButtonProps> = useCallback(
    ({ boundStation, direction }: RenderButtonProps) => {
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
        if (isJapanese) {
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
      } else if (isJapanese) {
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
    },
    [
      currentIndex,
      handleBoundSelected,
      inbound,
      isLoopLine,
      outbound,
      stations.length,
    ]
  );
  const handler = useMemo(
    () =>
      BackHandler.addEventListener('hardwareBackPress', () => {
        handleSelectBoundBackButtonPress();
        return true;
      }),
    [handleSelectBoundBackButtonPress]
  );

  const IOSShakeCaption: React.FC = useCallback(
    () => (
      <Text style={styles.iosShakeCaption}>{translate('shakeToOpenMenu')}</Text>
    ),
    []
  );

  const initialize = useCallback(() => {
    if (!selectedLine) {
      return;
    }

    fetchStationListFunc();
    setYamanoteLine(isYamanoteLine(selectedLine?.id));
    setOsakaLoopLine(isOsakaLoopLine(selectedLine?.id));
  }, [fetchStationListFunc, selectedLine]);

  useEffect(() => {
    initialize();
    return (): void => {
      if (handler) {
        handler.remove();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLine]);

  if (errors.length) {
    return (
      <ErrorScreen
        title={translate('errorTitle')}
        text={translate('apiErrorText')}
        onRetryPress={initialize}
      />
    );
  }

  if (!stations.length) {
    return (
      <View style={styles.bottom}>
        <Heading>{translate('selectBoundTitle')}</Heading>
        <ActivityIndicator
          style={styles.boundLoading}
          size="large"
          color="#555"
        />
        <View style={styles.buttons}>
          <Button color="#333" onPress={handleSelectBoundBackButtonPress}>
            {translate('back')}
          </Button>
        </View>

        {Platform.OS === 'ios' ? <IOSShakeCaption /> : null}
      </View>
    );
  }

  const inboundStation = stations[stations.length - 1];
  const outboundStation = stations[0];

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

  interface RenderButtonProps {
    boundStation: Station;
    direction: LineDirection;
  }

  return (
    <View style={styles.bottom}>
      <Heading>{translate('selectBoundTitle')}</Heading>

      <View style={styles.buttons}>
        <View style={styles.horizontalButtons}>
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
          {translate('back')}
        </Button>
      </View>
      {Platform.OS === 'ios' ? <IOSShakeCaption /> : null}
      <Button
        style={{ marginTop: 12 }}
        color="#555"
        onPress={handleNotificationButtonPress}
      >
        {translate('notifySettings')}
      </Button>
    </View>
  );
};

export default React.memo(SelectBoundScreen);
