import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
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
import Button from '../components/Button';
import ErrorScreen from '../components/ErrorScreen';
import Heading from '../components/Heading';
import useCurrentStation from '../hooks/useCurrentStation';
import useStationList from '../hooks/useStationList';
import useStationListByTrainType from '../hooks/useStationListByTrainType';
import { directionToDirectionName, LineDirection } from '../models/Bound';
import { Station } from '../models/StationAPI';
import devState from '../store/atoms/dev';
import lineState from '../store/atoms/line';
import navigationState from '../store/atoms/navigation';
import recordRouteState from '../store/atoms/record';
import stationState from '../store/atoms/station';
import { isJapanese, translate } from '../translation';
import getCurrentStationIndex from '../utils/currentStationIndex';
import {
  findLocalType,
  findRapidType,
  getIsChuoLineRapid,
} from '../utils/localType';
import {
  inboundStationsForLoopLine,
  isMeijoLine,
  isOsakaLoopLine,
  isYamanoteLine,
  outboundStationsForLoopLine,
} from '../utils/loopLine';

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
  const [meijoLine, setMeijoLine] = useState(false);
  const navigation = useNavigation();
  const [
    { station, stations, stationsWithTrainTypes, selectedBound },
    setStation,
  ] = useRecoilState(stationState);

  const currentStation = useCurrentStation({ withTrainTypes: true });

  const [withTrainTypes, setWithTrainTypes] = useState(false);
  const localType = findLocalType(
    stationsWithTrainTypes.find((s) => station?.groupId === s.groupId)
  );
  const [{ trainType, autoModeEnabled }, setNavigation] =
    useRecoilState(navigationState);
  const [{ selectedLine }, setLine] = useRecoilState(lineState);
  const setNavigationState = useSetRecoilState(navigationState);
  const [{ recordingEnabled }, setRecordRouteState] =
    useRecoilState(recordRouteState);
  const { devMode } = useRecoilValue(devState);

  useEffect(() => {
    if (selectedBound) {
      return;
    }

    const trainTypes = currentStation?.trainTypes || [];
    if (!trainTypes.length) {
      setWithTrainTypes(false);
      return;
    }

    // JR中央線快速は快速がデフォなので、快速を自動選択する
    if (getIsChuoLineRapid(selectedLine)) {
      setNavigation((prev) => ({
        ...prev,
        trainType: !prev.trainType
          ? findRapidType(currentStation)
          : prev.trainType,
      }));
      if (trainTypes.length > 1) {
        setWithTrainTypes(true);
      }
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
  }, [
    currentStation,
    currentStation?.trainTypes,
    localType,
    selectedBound,
    selectedLine,
    setNavigation,
  ]);

  const currentIndex = getCurrentStationIndex(stations, station);
  const [fetchStationListFunc, stationListLoading, stationListError] =
    useStationList();
  const [
    fetchStationListByTrainTypeFunc,
    fetchStationListByTrainTypeLoading,
    fetchStationListByTrainTypeError,
    clearCache,
  ] = useStationListByTrainType();

  useEffect(() => {
    if (fetchStationListByTrainTypeError) {
      Alert.alert(translate('errorTitle'), translate('apiErrorText'));
    }
  }, [fetchStationListByTrainTypeError]);

  const isLoopLine = (yamanoteLine || osakaLoopLine || meijoLine) && !trainType;
  const inboundStations = inboundStationsForLoopLine(
    stations,
    stations[currentIndex],
    selectedLine
  );
  const outboundStations = outboundStationsForLoopLine(
    stations,
    stations[currentIndex],
    selectedLine
  );

  const handleSelectBoundBackButtonPress =
    useCallback(async (): Promise<void> => {
      setLine((prev) => ({
        ...prev,
        selectedLine: null,
      }));
      setStation((prev) => ({
        ...prev,
        stations: [],
        stationsWithTrainTypes: [],
      }));
      setNavigationState((prev) => ({
        ...prev,
        headerState: isJapanese ? 'CURRENT' : 'CURRENT_EN',
        trainType: null,
        bottomState: 'LINE',
        leftStations: [],
        stationForHeader: null,
      }));
      setYamanoteLine(false);
      setOsakaLoopLine(false);
      await clearCache();
      navigation.navigate('SelectLine');
    }, [clearCache, navigation, setLine, setNavigationState, setStation]);

  const handleBoundSelected = useCallback(
    (selectedStation: Station, direction: LineDirection): void => {
      if (!selectedLine) {
        return;
      }

      setStation((prev) => ({
        ...prev,
        selectedBound: selectedStation,
        selectedDirection: direction,
      }));
      navigation.navigate('Main');
    },
    [navigation, selectedLine, setStation]
  );

  const handleNotificationButtonPress = (): void => {
    navigation.navigate('Notification');
  };

  const handleTrainTypeButtonPress = (): void => {
    navigation.navigate('TrainType');
  };

  const handleAutoModeButtonPress = useCallback(async () => {
    setNavigation((prev) => ({
      ...prev,
      autoModeEnabled: !prev.autoModeEnabled,
    }));
  }, [setNavigation]);

  const handleRecordRouteButtonPress = useCallback(async () => {
    setRecordRouteState((prev) => ({
      ...prev,
      recordingEnabled: !prev.recordingEnabled,
    }));
  }, [setRecordRouteState]);

  const renderButton: React.FC<RenderButtonProps> = useCallback(
    ({ boundStation, direction }: RenderButtonProps) => {
      if (!boundStation) {
        return <></>;
      }
      if (direction === 'INBOUND' && !isLoopLine) {
        if (currentIndex === stations.length - 1) {
          return <></>;
        }
      } else if (direction === 'OUTBOUND' && !isLoopLine) {
        if (!currentIndex) {
          return <></>;
        }
      }
      const directionName = directionToDirectionName(selectedLine, direction);
      let directionText = '';
      if (isLoopLine) {
        if (isJapanese) {
          if (direction === 'INBOUND') {
            directionText =
              inboundStations && !meijoLine
                ? `${inboundStations.map((s) => s.name).join('・')}方面`
                : directionName;
          } else {
            directionText =
              outboundStations && !meijoLine
                ? `${outboundStations.map((s) => s.name).join('・')}方面`
                : directionName;
          }
        } else if (direction === 'INBOUND') {
          directionText =
            inboundStations && !meijoLine
              ? `for ${inboundStations.map((s) => s.nameR).join(' and ')}`
              : directionName;
        } else {
          directionText =
            outboundStations && !meijoLine
              ? `for ${outboundStations.map((s) => s.nameR).join(' and ')}`
              : directionName;
        }
      } else if (isJapanese) {
        directionText = `${boundStation.map((s) => s.name)}方面`;
      } else {
        directionText = `for ${boundStation.map((s) => s.nameR).join('and')}`;
      }
      const boundSelectOnPress = (): void =>
        handleBoundSelected(boundStation[0], direction);
      return (
        <Button
          style={styles.button}
          color="#333"
          key={boundStation[0].groupId}
          onPress={boundSelectOnPress}
        >
          {directionText}
        </Button>
      );
    },
    [
      currentIndex,
      handleBoundSelected,
      inboundStations,
      isLoopLine,
      meijoLine,
      outboundStations,
      selectedLine,
      stations.length,
    ]
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
    setOsakaLoopLine(!trainType && isOsakaLoopLine(selectedLine?.id));
    setMeijoLine(isMeijoLine(selectedLine?.id));
  }, [localType, selectedLine, setNavigation, trainType]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useFocusEffect(
    useCallback(() => {
      if (!trainType && selectedLine) {
        fetchStationListFunc(selectedLine.id);
      }
    }, [fetchStationListFunc, selectedLine, trainType])
  );
  useFocusEffect(
    useCallback(() => {
      if (trainType) {
        fetchStationListByTrainTypeFunc(trainType.groupId);
      }
    }, [fetchStationListByTrainTypeFunc, trainType])
  );

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        handleSelectBoundBackButtonPress();
        return true;
      }
    );
    return subscription.remove;
  }, [handleSelectBoundBackButtonPress]);

  const autoModeButtonText = `${translate('autoModeSettings')}: ${
    autoModeEnabled ? 'ON' : 'OFF'
  }`;

  const recordRouteButtonText = `${translate('routeRecordSetting')}: ${
    recordingEnabled ? 'ON' : 'OFF'
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

  let computedInboundStation: Station[] = [];
  let computedOutboundStation: Station[] = [];
  if (yamanoteLine || (osakaLoopLine && !trainType)) {
    computedInboundStation = inboundStations;
    computedOutboundStation = outboundStations;
  } else {
    computedInboundStation = [inboundStation];
    computedOutboundStation = [outboundStation];
  }

  interface RenderButtonProps {
    boundStation: Station[];
    direction: LineDirection;
  }

  if (!computedInboundStation || !computedOutboundStation) {
    return null;
  }

  return (
    <ScrollView contentContainerStyle={styles.bottom}>
      <View style={styles.container}>
        <Heading>{translate('selectBoundTitle')}</Heading>
        {/* 名城線の左回り・右回り通りの配置にする */}
        {meijoLine ? (
          <View style={styles.horizontalButtons}>
            {renderButton({
              boundStation: computedOutboundStation,
              direction: 'OUTBOUND',
            })}
            {renderButton({
              boundStation: computedInboundStation,
              direction: 'INBOUND',
            })}
          </View>
        ) : (
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
        )}

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
          {devMode ? (
            <Button
              style={{ marginHorizontal: 6 }}
              color="#555"
              onPress={handleRecordRouteButtonPress}
            >
              {recordRouteButtonText}
            </Button>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
};

export default SelectBoundScreen;
