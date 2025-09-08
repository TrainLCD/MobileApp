import { useMutation, useQuery } from '@connectrpc/connect-query';
import { useNavigation } from '@react-navigation/native';
import { useSetAtom } from 'jotai';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  type NativeSyntheticEvent,
  Platform,
  StyleSheet,
  TextInput,
  type TextInputChangeEventData,
  type TextInputKeyPressEventData,
  View,
} from 'react-native';
import { SEARCH_STATION_RESULT_LIMIT } from 'react-native-dotenv';
import type { Route, Station } from '~/gen/proto/stationapi_pb';
import {
  getRoutes,
  getStationByIdList,
  getStationsByName,
} from '~/gen/proto/stationapi-StationAPI_connectquery';
import FAB from '../components/FAB';
import { Heading } from '../components/Heading';
import { RouteListModal } from '../components/RouteListModal';
import { StationList } from '../components/StationList';
import { FONTS } from '../constants';
import {
  useCurrentStation,
  useGetStationsWithTermination,
  useThemeStore,
  useTrainTypeStations,
} from '../hooks';
import type { LineDirection } from '../models/Bound';
import { APP_THEME } from '../models/Theme';
import lineState from '../store/atoms/line';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { translate } from '../translation';
import { groupStations } from '../utils/groupStations';
import { RFValue } from '../utils/rfValue';

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 48,
    paddingVertical: 12,
    flex: 1,
    alignItems: 'center',
  },
  settingItem: {
    width: '65%',
    height: '100%',
    alignItems: 'center',
  },
  heading: {
    marginBottom: 24,
  },
  stationNameInput: {
    borderWidth: 1,
    padding: 12,
    width: '100%',
    fontSize: RFValue(14),
  },
  emptyText: {
    fontSize: RFValue(16),
    textAlign: 'center',
    marginTop: 12,
    fontWeight: 'bold',
  },
});

const RouteSearchScreen = () => {
  const [query, setQuery] = useState('');
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);

  const navigation = useNavigation();
  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED);

  const [isRouteListModalVisible, setIsRouteListModalVisible] = useState(false);
  const setStationState = useSetAtom(stationState);
  const setLineState = useSetAtom(lineState);
  const setNavigationState = useSetAtom(navigationState);

  const currentStation = useCurrentStation();
  const getTerminatedStations = useGetStationsWithTermination();

  const { mutateAsync: fetchStationByIdList } = useMutation(getStationByIdList);

  const {
    fetchStations: fetchStationsByLineGroupId,
    isLoading: isTrainTypesLoading,
    error: fetchTrainTypesError,
  } = useTrainTypeStations();

  const {
    data: byNameData,
    status: byNameLoadingStatus,
    mutate: fetchByName,
    error: byNameError,
  } = useMutation(getStationsByName);

  const {
    data: routesData,
    isLoading: isRoutesLoading,
    error: fetchRoutesError,
  } = useQuery(
    getRoutes,
    {
      fromStationGroupId: currentStation?.groupId,
      toStationGroupId: selectedStation?.groupId,
    },
    { enabled: !!currentStation && !!selectedStation }
  );

  const onPressBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const handleSubmit = useCallback(() => {
    if (!currentStation || !query.trim().length) {
      return;
    }
    fetchByName({
      stationName: query.trim(),
      limit: Number(SEARCH_STATION_RESULT_LIMIT),
      fromStationGroupId: currentStation?.groupId,
    });
  }, [currentStation, fetchByName, query]);

  useEffect(() => {
    if (byNameError) {
      Alert.alert(translate('errorTitle'), translate('apiErrorText'));
    }
  }, [byNameError]);

  // NOTE: 今いる駅は出なくていい
  const groupedStations = useMemo(
    () =>
      groupStations(byNameData?.stations ?? []).filter(
        (sta) => sta.groupId !== currentStation?.groupId
      ),
    [byNameData?.stations, currentStation?.groupId]
  );

  const handleStationPress = useCallback(
    async (stationFromSearch: Station) => {
      setLineState((prev) => ({
        ...prev,
        selectedLine: stationFromSearch.line ?? null,
      }));
      setSelectedStation(stationFromSearch);
      setIsRouteListModalVisible(true);
    },
    [setLineState]
  );

  const onKeyPress = useCallback(
    (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      if (e.nativeEvent.key === 'Enter') {
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const onChange = useCallback(
    (e: NativeSyntheticEvent<TextInputChangeEventData>) => {
      setQuery(e.nativeEvent.text);
    },
    []
  );

  const handleSelect = useCallback(
    async (route: Route | undefined, asTerminus: boolean) => {
      const stop = route?.stops.find(
        (s) => s.groupId === currentStation?.groupId
      );
      if (!stop) {
        return;
      }

      const trainType = stop.trainType;

      if (!trainType?.id) {
        const { stations } = await fetchStationByIdList({
          ids: route?.stops.map((r) => r.id),
        });
        const stationInRoute =
          stations.find((s) => s.groupId === currentStation?.groupId) ?? null;

        const direction: LineDirection | null = (() => {
          const fromIdx = (stations ?? []).findIndex(
            (s) => s.groupId === currentStation?.groupId
          );
          const toIdx = (stations ?? []).findIndex(
            (s) => s.groupId === selectedStation?.groupId
          );
          if (fromIdx === -1 || toIdx === -1) {
            return null;
          }
          return fromIdx < toIdx ? 'INBOUND' : 'OUTBOUND';
        })();

        if (!direction) {
          return;
        }

        setNavigationState((prev) => ({ ...prev, trainType: null }));

        const terminatedStations = getTerminatedStations(
          selectedStation,
          stations ?? []
        );

        setStationState((prev) => ({
          ...prev,
          station: stationInRoute,
          stations: asTerminus ? terminatedStations : stations,
          selectedDirection: direction,
          selectedBound: asTerminus
            ? direction === 'INBOUND'
              ? terminatedStations[terminatedStations.length - 1]
              : terminatedStations[0]
            : direction === 'INBOUND'
              ? (stations[stations.length - 1] ?? null)
              : (stations[0] ?? null),
        }));
        navigation.navigate('Main' as never);
        return;
      }

      const { stations } = await fetchStationsByLineGroupId({
        lineGroupId: trainType.groupId,
      });

      const station =
        stations.find((s) => s.groupId === currentStation?.groupId) ?? null;

      const direction: LineDirection | null = (() => {
        const fromIdx = (stations ?? []).findIndex(
          (s) => s.groupId === currentStation?.groupId
        );
        const toIdx = (stations ?? []).findIndex(
          (s) => s.groupId === selectedStation?.groupId
        );
        if (fromIdx === -1 || toIdx === -1) {
          return null;
        }
        return fromIdx < toIdx ? 'INBOUND' : 'OUTBOUND';
      })();

      if (!direction) {
        return;
      }

      const terminatedStations = getTerminatedStations(
        selectedStation,
        stations ?? []
      );

      setNavigationState((prev) => ({
        ...prev,
        trainType,
        stationForHeader: station,
      }));
      setStationState((prev) => ({
        ...prev,
        station,
        stations: asTerminus ? terminatedStations : stations,
        selectedDirection: direction,
        selectedBound: asTerminus
          ? direction === 'INBOUND'
            ? terminatedStations[terminatedStations.length - 1]
            : terminatedStations[0]
          : direction === 'INBOUND'
            ? stations[stations.length - 1]
            : stations[0],
      }));
      // navigation.dispatch(
      //   StackActions.replace('MainStack', { screen: 'Main' })
      // );
    },
    [
      currentStation?.groupId,
      fetchStationByIdList,
      fetchStationsByLineGroupId,
      navigation,
      selectedStation?.groupId,
      setNavigationState,
      setStationState,
      selectedStation,
      getTerminatedStations,
    ]
  );

  return (
    <>
      <View
        style={{
          ...styles.root,
          backgroundColor: isLEDTheme ? '#212121' : '#fff',
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.settingItem}
        >
          <Heading style={styles.heading}>
            {translate('routeSearchTitle')}
          </Heading>
          <TextInput
            placeholder={translate('searchDestinationPlaceholder')}
            value={query}
            style={{
              ...styles.stationNameInput,
              borderColor: isLEDTheme ? '#fff' : '#aaa',
              color: isLEDTheme ? '#fff' : '#000',
              fontFamily: isLEDTheme ? FONTS.JFDotJiskan24h : undefined,
            }}
            placeholderTextColor={isLEDTheme ? '#fff' : undefined}
            onChange={onChange}
            onSubmitEditing={handleSubmit}
            onKeyPress={onKeyPress}
          />
          {byNameLoadingStatus === 'pending' ? (
            <View
              style={{
                ...StyleSheet.absoluteFillObject,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <ActivityIndicator size="large" />
            </View>
          ) : (
            <StationList
              withoutTransfer
              fromRoutes
              data={groupedStations}
              onSelect={handleStationPress}
            />
          )}
        </KeyboardAvoidingView>
      </View>
      <FAB onPress={onPressBack} icon="close" disabled={isTrainTypesLoading} />
      {selectedStation && (
        <RouteListModal
          finalStation={selectedStation}
          routes={routesData?.routes ?? []}
          visible={isRouteListModalVisible}
          isRoutesLoading={isRoutesLoading}
          isTrainTypesLoading={isTrainTypesLoading}
          error={fetchRoutesError || fetchTrainTypesError}
          onClose={() => setIsRouteListModalVisible(false)}
          onSelect={handleSelect}
        />
      )}
    </>
  );
};

export default React.memo(RouteSearchScreen);
