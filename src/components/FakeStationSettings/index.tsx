import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInputChangeEventData,
  NativeSyntheticEvent,
  Platform,
  KeyboardAvoidingView,
  TextInputKeyPressEventData,
  Alert,
} from 'react-native';
import gql from 'graphql-tag';
import { useNavigation } from '@react-navigation/native';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { useLazyQuery } from '@apollo/client';
import { RFValue } from 'react-native-responsive-fontsize';
import * as geolib from 'geolib';
import analytics from '@react-native-firebase/analytics';
import {
  StationsByNameData,
  Station,
  NearbyStationsData,
} from '../../models/StationAPI';
import { PREFS_JA, PREFS_EN } from '../../constants';
import Heading from '../Heading';
import { isJapanese, translate } from '../../translation';
import FAB from '../FAB';
import locationState from '../../store/atoms/location';
import navigationState from '../../store/atoms/navigation';
import stationState from '../../store/atoms/station';
import devState from '../../store/atoms/dev';

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
  backButton: {
    marginTop: 24,
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
  const navigation = useNavigation();
  const [{ station: stationFromState }, setStation] =
    useRecoilState(stationState);
  const setNavigation = useSetRecoilState(navigationState);
  const setDevMode = useSetRecoilState(devState);
  const { location } = useRecoilValue(locationState);

  const STATION_BY_NAME_TYPE = gql`
    query StationByName($name: String!) {
      stationsByName(name: $name) {
        id
        groupId
        prefId
        name
        nameK
        nameR
        address
        latitude
        longitude
        lines {
          id
          companyId
          lineColorC
          name
          nameR
          nameK
          lineType
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
        lines {
          id
          companyId
          lineColorC
          name
          nameR
          nameK
          lineType
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

  const onPressBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const handeEasterEgg = useCallback(() => {
    setDevMode({
      devMode: true,
    });
    Alert.alert(translate('easterEggTitle'), translate('easterEggDescription'));
  }, [setDevMode]);

  const triggerChange = useCallback(async () => {
    if (!query.length) {
      return;
    }

    if (query === process.env.EASTER_EGG_STRING) {
      handeEasterEgg();
    }

    getStationByName({
      variables: {
        name: query,
      },
    });
  }, [getStationByName, handeEasterEgg, query]);

  useEffect(() => {
    if (foundStations.length) {
      return;
    }
    getStationsByCoords({
      variables: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        limit: parseInt(process.env.NEARBY_STATIONS_LIMIT, 10),
      },
    });
  }, [
    foundStations.length,
    getStationsByCoords,
    location.coords.latitude,
    location.coords.longitude,
  ]);

  const processStations = useCallback(
    (stations: Station[]) => {
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
        .sort((a, b) => {
          if (!location) {
            return 0;
          }
          const { coords } = location;
          const toADistance = geolib.getDistance(
            { latitude: coords.latitude, longitude: coords.longitude },
            {
              latitude: a.latitude,
              longitude: a.longitude,
            }
          );
          const toBDistance = geolib.getDistance(
            { latitude: coords.latitude, longitude: coords.longitude },
            {
              latitude: b.latitude,
              longitude: b.longitude,
            }
          );
          if (toADistance > toBDistance) {
            return 1;
          }
          if (toADistance < toBDistance) {
            return -1;
          }
          return 0;
        });
      setFoundStations(mapped);
    },
    [location]
  );

  useEffect(() => {
    if (byNameData) {
      processStations(byNameData.stationsByName);
    }
  }, [byNameData, processStations]);

  useEffect(() => {
    if (byCoordsData) {
      processStations(byCoordsData.nearbyStations);
    }
  }, [byCoordsData, processStations]);

  useEffect(() => {
    if (byNameError || byCoordsError) {
      Alert.alert(translate('errorTitle'), translate('apiErrorText'));
    }
  }, [byCoordsError, byNameError]);

  const onStationPress = useCallback(
    async (station: Station) => {
      analytics().logEvent('stationSelected', {
        id: station.id.toString(),
        name: station.name,
      });

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

  const onSubmitEditing = useCallback(() => {
    if (!dirty) {
      setDirty(true);
    }
    triggerChange();
  }, [dirty, triggerChange]);

  const onKeyPress = useCallback(
    (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      if (e.nativeEvent.key === 'Enter') {
        onSubmitEditing();
      }
    },
    [onSubmitEditing]
  );

  const onChange = useCallback(
    (e: NativeSyntheticEvent<TextInputChangeEventData>) => {
      setQuery(e.nativeEvent.text);
    },
    []
  );

  const ListEmptyComponent: React.FC = () => {
    if (!dirty) {
      return <Text style={styles.emptyText}>{translate('queryEmpty')}</Text>;
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
            placeholder={translate('searchByStationNamePlaceholder')}
            value={query}
            style={styles.stationNameInput}
            onChange={onChange}
            onSubmitEditing={onSubmitEditing}
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
