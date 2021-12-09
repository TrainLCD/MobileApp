import analytics from '@react-native-firebase/analytics';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { RFValue } from 'react-native-responsive-fontsize';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import Button from '../../components/Button';
import ErrorScreen from '../../components/ErrorScreen';
import Heading from '../../components/Heading';
import useConnectivity from '../../hooks/useConnectivity';
import useStationList from '../../hooks/useStationList';
import useStationListByTrainType from '../../hooks/useStationListByTrainType';
import { directionToDirectionName, LineDirection } from '../../models/Bound';
import { HeaderLangState } from '../../models/HeaderTransitionState';
import { Station } from '../../models/StationAPI';
import lineState from '../../store/atoms/line';
import navigationState from '../../store/atoms/navigation';
import stationState from '../../store/atoms/station';
import themeState from '../../store/atoms/theme';
import { isJapanese, translate } from '../../translation';
import getCurrentStationIndex from '../../utils/currentStationIndex';
import getLocalType from '../../utils/localType';
import {
  inboundStationForLoopLine,
  isYamanoteLine,
  outboundStationForLoopLine,
} from '../../utils/loopLine';

const styles = StyleSheet.create({
  boundLoading: {
    marginTop: 24,
  },
  bottom: {
    padding: 24,
  },
  buttons: {
    marginTop: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    marginLeft: 8,
    marginRight: 8,
  },
  horizontalButtons: {
    flexDirection: 'row',
    marginVertical: 12,
  },
  shakeCaption: {
    fontWeight: 'bold',
    marginTop: 12,
    color: '#555',
    fontSize: RFValue(18),
    textAlign: 'center',
  },
});

const SelectBoundScreen: React.FC = () => {
  const [yamanoteLine, setYamanoteLine] = useState(false);
  const [osakaLoopLine, setOsakaLoopLine] = useState(false);
  const navigation = useNavigation();
  const [
    { station, stations, stationsWithTrainTypes, selectedBound },
    setStation,
  ] = useRecoilState(stationState);
  const { theme } = useRecoilValue(themeState);

  const currentStation = stationsWithTrainTypes.find(
    (s) => station?.groupId === s.groupId
  );
  const [withTrainTypes, setWithTrainTypes] = useState(false);
  const localType = getLocalType(
    stationsWithTrainTypes.find((s) => station?.groupId === s.groupId)
  );
  const [{ headerState, trainType, autoMode }, setNavigation] =
    useRecoilState(navigationState);

  useEffect(() => {
    if (selectedBound) {
      return;
    }

    const trainTypes = currentStation?.trainTypes || [];
    if (!trainTypes.length) {
      setWithTrainTypes(false);
      return;
    }
    if (trainTypes.length === 1) {
      const branchLineType = trainTypes.find(
        (tt) => tt.name.indexOf('支線') !== -1
      );
      if (branchLineType) {
        setWithTrainTypes(false);
        setNavigation((prev) => ({
          ...prev,
          trainType: branchLineType,
        }));
        return;
      }
      if (trainTypes.find((tt) => tt.id === localType?.id)) {
        setNavigation((prev) => ({
          ...prev,
          trainType: localType,
        }));
        setWithTrainTypes(false);
        return;
      }
      setWithTrainTypes(true);
    }
    setWithTrainTypes(true);
  }, [currentStation?.trainTypes, localType, selectedBound, setNavigation]);

  const [{ selectedLine }, setLine] = useRecoilState(lineState);
  const setNavigationState = useSetRecoilState(navigationState);
  const currentIndex = getCurrentStationIndex(stations, station);
  const [fetchStationListFunc, stationListLoading, stationListError] =
    useStationList();
  const [
    fetchStationListByTrainTypeFunc,
    fetchStationListByTrainTypeLoading,
    fetchStationListByTrainTypeError,
  ] = useStationListByTrainType();

  useEffect(() => {
    if (fetchStationListByTrainTypeError) {
      Alert.alert(translate('errorTitle'), translate('apiErrorText'));
    }
  }, [fetchStationListByTrainTypeError]);

  const headerLangState = headerState.split('_')[1] as HeaderLangState;

  const isLoopLine = (yamanoteLine || osakaLoopLine) && !trainType;
  const inbound = inboundStationForLoopLine(
    stations,
    currentIndex,
    selectedLine,
    headerLangState
  );
  const outbound = outboundStationForLoopLine(
    stations,
    currentIndex,
    selectedLine,
    headerLangState
  );

  const handleSelectBoundBackButtonPress = useCallback((): void => {
    setLine((prev) => ({
      ...prev,
      selectedLine: null,
    }));
    setNavigationState((prev) => ({
      ...prev,
      headerState: isJapanese ? 'CURRENT' : 'CURRENT_EN',
      trainType: null,
      bottomState: 'LINE',
      leftStations: [],
      stationForHeader: null,
      stations: [],
      rawStations: [],
    }));
    setYamanoteLine(false);
    setOsakaLoopLine(false);
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation, setLine, setNavigationState]);

  const handleBoundSelected = useCallback(
    async (
      selectedStation: Station,
      direction: LineDirection
    ): Promise<void> => {
      await analytics().logEvent('boundSelected', {
        id: selectedStation?.id.toString(),
        name: selectedStation?.name,
        direction,
      });

      if (!selectedLine) {
        return;
      }

      await analytics().setUserProperties({
        lineId: selectedLine.id.toString(),
        lineName: selectedLine.name,
        stationId: selectedStation.id.toString(),
        stationName: selectedStation.name,
        themeId: theme.toString(),
      });

      setStation((prev) => ({
        ...prev,
        selectedBound: selectedStation,
        selectedDirection: direction,
      }));
      navigation.navigate('Main');
    },
    [navigation, selectedLine, setStation, theme]
  );

  const handleNotificationButtonPress = (): void => {
    navigation.navigate('Notification');
  };

  const handleTrainTypeButtonPress = (): void => {
    navigation.navigate('TrainType');
  };

  const handleAutoModeButtonPress = () =>
    setNavigation((prev) => ({
      ...prev,
      autoMode: !prev.autoMode,
    }));

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
        if (!inbound || !outbound) {
          return null;
        }
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
      const boundSelectOnPress = (): Promise<void> =>
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

  const initialize = useCallback(() => {
    if (!selectedLine || trainType) {
      return;
    }

    if (localType) {
      setNavigation((prev) => ({
        ...prev,
        trainType: localType,
      }));
    }
    setYamanoteLine(isYamanoteLine(selectedLine?.id));
    setOsakaLoopLine(!trainType && selectedLine?.id === 11623);
  }, [localType, selectedLine, setNavigation, trainType]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const isInternetAvailable = useConnectivity();

  useEffect(() => {
    if (trainType && isInternetAvailable) {
      fetchStationListByTrainTypeFunc(trainType.groupId);
    }
  }, [fetchStationListByTrainTypeFunc, isInternetAvailable, trainType]);

  useEffect(() => {
    if (!trainType && isInternetAvailable && selectedLine) {
      fetchStationListFunc(selectedLine.id);
    }
  }, [fetchStationListFunc, isInternetAvailable, selectedLine, trainType]);

  useEffect(() => {
    if (selectedLine && isInternetAvailable) {
      fetchStationListFunc(selectedLine.id);
    }
  }, [fetchStationListFunc, isInternetAvailable, selectedLine]);

  useEffect(() => {
    return (): void => {
      if (handler) {
        handler.remove();
      }
    };
  }, [handler]);

  const autoModeButtonText = `${translate('autoModeSettings')}: ${
    autoMode ? 'ON' : 'OFF'
  }`;

  if (stationListError) {
    return (
      <ErrorScreen
        title={translate('errorTitle')}
        text={translate('apiErrorText')}
        onRetryPress={initialize}
      />
    );
  }

  if (
    !stations.length ||
    stationListLoading ||
    fetchStationListByTrainTypeLoading
  ) {
    return (
      <ScrollView contentContainerStyle={styles.bottom}>
        <View style={styles.container}>
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

          <Text style={styles.shakeCaption}>
            {translate('shakeToOpenMenu')}
          </Text>
        </View>
      </ScrollView>
    );
  }

  const inboundStation = stations[stations.length - 1];
  const outboundStation = stations[0];

  let computedInboundStation: Station | null = null;
  let computedOutboundStation: Station | null = null;
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

  if (!computedInboundStation || !computedOutboundStation) {
    return null;
  }

  return (
    <ScrollView contentContainerStyle={styles.bottom}>
      <View style={styles.container}>
        <Heading>{translate('selectBoundTitle')}</Heading>
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
        <Text style={styles.shakeCaption}>{translate('shakeToOpenMenu')}</Text>
        <View style={{ flexDirection: 'row', marginTop: 12 }}>
          <Button
            style={{ marginHorizontal: 6 }}
            color="#555"
            onPress={handleNotificationButtonPress}
          >
            {translate('notifySettings')}
          </Button>
          {withTrainTypes ? (
            <Button
              style={{ marginHorizontal: 6 }}
              color="#555"
              onPress={handleTrainTypeButtonPress}
            >
              {translate('trainTypeSettings')}
            </Button>
          ) : null}
          <Button
            style={{ marginHorizontal: 6 }}
            color="#555"
            onPress={handleAutoModeButtonPress}
          >
            {autoModeButtonText}
          </Button>
        </View>
      </View>
    </ScrollView>
  );
};

export default SelectBoundScreen;
