import { useLazyQuery, useQuery } from '@apollo/client/react';
import { useNavigation } from '@react-navigation/native';
import { useAtom, useSetAtom } from 'jotai';
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
import {
  NEARBY_STATIONS_LIMIT,
  SEARCH_STATION_RESULT_LIMIT,
} from 'react-native-dotenv';
import type { Station } from '~/@types/graphql';
import {
  GET_STATIONS_BY_NAME,
  GET_STATIONS_NEARBY,
} from '~/lib/graphql/queries';
import FAB from '../components/FAB';
import { Heading } from '../components/Heading';
import { StationList } from '../components/StationList';
import { FONTS } from '../constants';
import { useCurrentStation, useLocationStore, useThemeStore } from '../hooks';
import { APP_THEME } from '../models/Theme';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { TestIds } from '../test/e2e';
import { translate } from '../translation';
import { groupStations } from '../utils/groupStations';
import { RFValue } from '../utils/rfValue';

type GetStationsNearbyData = {
  stationsNearby: Station[];
};

type GetStationsNearbyVariables = {
  latitude: number;
  longitude: number;
  limit?: number;
};

type GetStationsByNameData = {
  stationsByName: Station[];
};

type GetStationsByNameVariables = {
  name: string;
  limit?: number;
  fromStationGroupId?: number;
};

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

const FakeStationSettingsScreen: React.FC = () => {
  const [query, setQuery] = useState('');
  const navigation = useNavigation();
  const [{ station: stationFromState }, setStationState] =
    useAtom(stationState);
  const setNavigationState = useSetAtom(navigationState);
  const latitude = useLocationStore((state) => state?.coords.latitude);
  const longitude = useLocationStore((state) => state?.coords.longitude);
  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED);

  const _currentStation = useCurrentStation();

  const {
    data: byCoordsData,
    loading: isByCoordsLoading,
    error: byCoordsError,
  } = useQuery<GetStationsNearbyData, GetStationsNearbyVariables>(
    GET_STATIONS_NEARBY,
    {
      variables: {
        latitude: latitude ?? 0,
        longitude: longitude ?? 0,
        limit: Number(NEARBY_STATIONS_LIMIT),
      },
      skip: !latitude || !longitude,
    }
  );

  const [
    fetchByName,
    { data: byNameData, error: byNameError, loading: byNameLoading },
  ] = useLazyQuery<GetStationsByNameData, GetStationsByNameVariables>(
    GET_STATIONS_BY_NAME
  );

  const byNameFetchStatus = byNameLoading ? 'pending' : 'success';

  const onPressBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('MainStack' as never);
  }, [navigation]);

  const handleSubmit = useCallback(() => {
    if (!query.trim().length) {
      return;
    }
    fetchByName({
      variables: {
        name: query.trim(),
        limit: Number(SEARCH_STATION_RESULT_LIMIT),
      },
    });
  }, [fetchByName, query]);

  useEffect(() => {
    if (byNameError || byCoordsError) {
      Alert.alert(translate('errorTitle'), translate('apiErrorText'));
    }
  }, [byCoordsError, byNameError]);

  const foundStations = useMemo(
    () => byNameData?.stationsByName ?? byCoordsData?.stationsNearby ?? [],
    [byCoordsData, byNameData]
  );

  const groupedStations = useMemo(
    () => groupStations(foundStations),
    [foundStations]
  );

  const handleStationPress = useCallback(
    (stationFromSearch: Station) => {
      const station = foundStations.find(
        (s: Station) => s.id === stationFromSearch.id
      );
      if (!station) {
        return;
      }
      setStationState((prev) => ({
        ...prev,
        station,
      }));
      setNavigationState((prev) => ({
        ...prev,
        stationForHeader: station,
      }));
      onPressBack();
    },
    [foundStations, onPressBack, setNavigationState, setStationState]
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

  return (
    <>
      <View
        style={[
          styles.root,
          {
            backgroundColor: isLEDTheme ? '#212121' : '#fff',
          },
        ]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.settingItem}
        >
          <Heading style={styles.heading}>
            {translate('searchFirstStationTitle')}
          </Heading>
          <TextInput
            placeholder={translate('searchByStationNamePlaceholder')}
            value={query}
            style={[
              styles.stationNameInput,
              {
                borderColor: isLEDTheme ? '#fff' : '#aaa',
                color: isLEDTheme ? '#fff' : '#000',
                fontFamily: isLEDTheme ? FONTS.JFDotJiskan24h : undefined,
              },
            ]}
            placeholderTextColor={isLEDTheme ? '#fff' : undefined}
            onChange={onChange}
            onSubmitEditing={handleSubmit}
            onKeyPress={onKeyPress}
            testID={TestIds.Input.StationNameQuery}
          />
          {isByCoordsLoading || byNameFetchStatus === 'pending' ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  justifyContent: 'center',
                  alignItems: 'center',
                },
              ]}
            >
              <ActivityIndicator size="large" />
            </View>
          ) : (
            <StationList
              withoutTransfer
              data={groupedStations}
              onSelect={handleStationPress}
            />
          )}
        </KeyboardAvoidingView>
      </View>
      {((latitude && longitude) || stationFromState) && (
        <FAB onPress={onPressBack} icon="close" />
      )}
    </>
  );
};

export default React.memo(FakeStationSettingsScreen);
