import { useLazyQuery } from '@apollo/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import gql from 'graphql-tag';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  NativeSyntheticEvent,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TextInputChangeEventData,
  TextInputKeyPressEventData,
  TouchableOpacity,
  View,
} from 'react-native';
import { RFValue } from 'react-native-responsive-fontsize';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { PREFS_EN, PREFS_JA } from '../constants';
import { ASYNC_STORAGE_KEYS } from '../constants/asyncStorageKeys';
import useDevToken from '../hooks/useDevToken';
import {
  NearbyStationsData,
  Station,
  StationsByNameData,
} from '../models/StationAPI';
import locationState from '../store/atoms/location';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { isJapanese, translate } from '../translation';
import changeAppIcon from '../utils/native/customIconModule';
import FAB from './FAB';
import Heading from './Heading';

const styles = StyleSheet.create({
  rootPadding: {
    padding: 72,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  settingItem: {
    width: '50%',
    alignItems: 'center',
  },
  heading: {
    marginBottom: 24,
  },
  stationNameInput: {
    borderWidth: 1,
    borderColor: '#aaa',
    padding: 12,
    width: '100%',
    marginBottom: 24,
    color: 'black',
    fontSize: RFValue(14),
  },
  loadingRoot: {
    marginBottom: 24,
  },
  stationNameText: {
    fontSize: RFValue(14),
  },
  cell: {
    flex: 1,
    padding: 12,
  },
  divider: {
    height: 1,
    width: '100%',
    backgroundColor: '#aaa',
  },
  emptyText: {
    fontSize: RFValue(16),
    textAlign: 'center',
    marginTop: 12,
    fontWeight: 'bold',
  },
  flatList: {
    borderColor: '#aaa',
  },
});

interface StationNameCellProps {
  item: Station;
  onPress: (station: Station) => void;
}

const StationNameCell: React.FC<StationNameCellProps> = ({
  item,
  onPress,
}: StationNameCellProps) => {
  const handleOnPress = useCallback(() => {
    onPress(item);
  }, [item, onPress]);
  return (
    <TouchableOpacity style={styles.cell} onPress={handleOnPress}>
      <Text style={styles.stationNameText}>
        {isJapanese ? item.nameForSearch : item.nameForSearchR}
      </Text>
    </TouchableOpacity>
  );
};

const Loading: React.FC = () => (
  <View style={styles.loadingRoot}>
    <ActivityIndicator size="large" color="#555" />
  </View>
);

const FakeStationSettings: React.FC = () => {
  const [query, setQuery] = useState('');
  const [foundStations, setFoundStations] = useState<Station[]>([]);
  const [dirty, setDirty] = useState(false);
  const [loadingEligibility, setLoadingEligibility] = useState(false);
  const navigation = useNavigation();
  const [{ station: stationFromState }, setStation] =
    useRecoilState(stationState);
  const setNavigation = useSetRecoilState(navigationState);
  const { location } = useRecoilValue(locationState);
  const prevQueryRef = useRef<string>();

  const STATION_BY_NAME_TYPE = gql`
    query StationByName($name: String!) {
      stationsByName(name: $name) {
        id
        groupId
        prefId
        name
        nameK
        nameR
        nameZh
        nameKo
        address
        latitude
        longitude
        stationNumbers {
          lineSymbolColor
          stationNumber
          lineSymbol
        }
        lines {
          id
          companyId
          lineColorC
          name
          nameR
          nameK
          lineType
          lineSymbols {
            lineSymbol
          }
        }
      }
    }
  `;
  const NEARBY_STATIONS_TYPE = gql`
    query NearbyStations($latitude: Float!, $longitude: Float!, $limit: Int!) {
      nearbyStations(
        latitude: $latitude
        longitude: $longitude
        limit: $limit
      ) {
        id
        groupId
        prefId
        name
        nameK
        nameR
        address
        latitude
        longitude
        stationNumbers {
          lineSymbolColor
          stationNumber
          lineSymbol
        }
        currentLine {
          lineSymbols {
            lineSymbol
          }
        }
        lines {
          id
          companyId
          lineColorC
          name
          nameR
          nameK
          lineType
          lineSymbols {
            lineSymbol
          }
        }
      }
    }
  `;

  const [
    getStationByName,
    { loading: byNameLoading, error: byNameError, data: byNameData },
  ] = useLazyQuery<StationsByNameData>(STATION_BY_NAME_TYPE);
  const [
    getStationsByCoords,
    { loading: byCoordsLoading, error: byCoordsError, data: byCoordsData },
  ] = useLazyQuery<NearbyStationsData>(NEARBY_STATIONS_TYPE);

  const { checkEligibility, setToken } = useDevToken();

  const onPressBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('MainStack');
  }, [navigation]);

  const triggerChange = useCallback(async () => {
    const trimmedQuery = query.trim();
    const trimmedPrevQuery = prevQueryRef.current?.trim();
    if (!trimmedQuery.length || trimmedQuery === trimmedPrevQuery) {
      return;
    }

    setDirty(true);
    setLoadingEligibility(true);
    setFoundStations([]);
    try {
      const eligibility = await checkEligibility(trimmedQuery);

      switch (eligibility) {
        case 'eligible':
          setToken(trimmedQuery);
          await AsyncStorage.setItem(
            ASYNC_STORAGE_KEYS.DEV_MODE_ENABLED,
            'true'
          );
          await AsyncStorage.setItem(
            ASYNC_STORAGE_KEYS.DEV_MODE_TOKEN,
            trimmedQuery
          );
          Alert.alert(
            translate('warning'),
            translate('enabledDevModeDescription'),
            [{ text: 'OK', onPress: () => changeAppIcon('AppIconDev') }]
          );
          break;
        // トークンが無効のときも何もしない
        default:
          break;
      }
    } catch (err) {
      Alert.alert(translate('errorTitle'), translate('apiErrorText'));
    } finally {
      setLoadingEligibility(false);
    }

    prevQueryRef.current = trimmedQuery;

    getStationByName({
      variables: {
        name: trimmedQuery,
      },
    });
  }, [checkEligibility, getStationByName, query, setToken]);

  useEffect(() => {
    if (foundStations.length || !location?.coords) {
      return;
    }
    getStationsByCoords({
      variables: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        limit: process.env.NEARBY_STATIONS_LIMIT
          ? parseInt(process.env.NEARBY_STATIONS_LIMIT, 10)
          : 10,
      },
    });
  }, [foundStations.length, getStationsByCoords, location?.coords]);

  const processStations = useCallback(
    (stations: Station[], sortRequired?: boolean) => {
      const mapped = stations
        .map((g, i, arr) => {
          const sameNameAndDifferentPrefStations = arr.filter(
            (s) => s.name === g.name && s.prefId !== g.prefId
          );
          if (sameNameAndDifferentPrefStations.length) {
            return {
              ...g,
              nameForSearch: `${g.name}(${PREFS_JA[g.prefId - 1]})`,
              nameForSearchR: `${g.nameR}(${PREFS_EN[g.prefId - 1]})`,
            };
          }
          return {
            ...g,
            nameForSearch: g.name,
            nameForSearchR: g.nameR,
          };
        })
        .map((g, i, arr) => {
          const sameNameStations = arr.filter(
            (s) => s.nameForSearch === g.nameForSearch
          );
          if (sameNameStations.length) {
            return sameNameStations.reduce((acc, cur) => ({
              ...acc,
              lines: Array.from(new Set([...acc.lines, ...cur.lines])),
            }));
          }
          return g;
        })
        .filter(
          (g, i, arr) =>
            arr.findIndex((s) => s.nameForSearch === g.nameForSearch) === i
        )
        .sort((a, b) => (sortRequired ? b.lines.length - a.lines.length : 0));
      setFoundStations(mapped);
    },
    []
  );

  useEffect(() => {
    if (byNameData) {
      processStations(byNameData.stationsByName, true);
    }
  }, [byNameData, processStations]);

  useEffect(() => {
    if (byCoordsData && !dirty) {
      processStations(byCoordsData.nearbyStations);
    }
  }, [byCoordsData, dirty, processStations]);

  useEffect(() => {
    if (byNameError || byCoordsError) {
      Alert.alert(translate('errorTitle'), translate('apiErrorText'));
    }
  }, [byCoordsError, byNameError]);

  const onStationPress = useCallback(
    (station: Station) => {
      setStation((prev) => ({
        ...prev,
        station,
      }));
      setNavigation((prev) => ({
        ...prev,
        stationForHeader: station,
      }));
      onPressBack();
    },
    [onPressBack, setNavigation, setStation]
  );

  const renderStationNameCell = useCallback(
    ({ item }) => (
      <>
        <StationNameCell onPress={onStationPress} item={item} />
        <View style={styles.divider} />
      </>
    ),
    [onStationPress]
  );

  const keyExtractor = useCallback((item) => item.id.toString(), []);

  const onKeyPress = useCallback(
    (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      if (e.nativeEvent.key === 'Enter') {
        triggerChange();
      }
    },
    [triggerChange]
  );

  const onChange = useCallback(
    (e: NativeSyntheticEvent<TextInputChangeEventData>) => {
      setQuery(e.nativeEvent.text);
    },
    []
  );

  const ListEmptyComponent: React.FC = () => {
    if (byNameLoading || byCoordsLoading || loadingEligibility) {
      return <Loading />;
    }

    return (
      <Text style={styles.emptyText}>{translate('stationListEmpty')}</Text>
    );
  };

  return (
    <>
      <View style={styles.rootPadding}>
        <Heading style={styles.heading}>
          {translate('specifyStationTitle')}
        </Heading>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.settingItem}
        >
          <TextInput
            autoFocus
            placeholder={translate('searchByStationNamePlaceholder')}
            value={query}
            style={styles.stationNameInput}
            onChange={onChange}
            onSubmitEditing={triggerChange}
            onKeyPress={onKeyPress}
          />
          <View
            style={{
              width: '100%',
              height: '50%',
            }}
          >
            {(byNameLoading || byCoordsLoading) && <Loading />}
            {!(byNameLoading || byCoordsLoading) && (
              <FlatList
                style={{
                  ...styles.flatList,
                  borderWidth: foundStations.length ? 1 : 0,
                }}
                data={foundStations}
                renderItem={renderStationNameCell}
                keyExtractor={keyExtractor}
                ListEmptyComponent={ListEmptyComponent}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
      {(location || stationFromState) && (
        <FAB onPress={onPressBack} icon="md-close" />
      )}
    </>
  );
};

export default FakeStationSettings;
