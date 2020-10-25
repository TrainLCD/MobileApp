import React, { memo, useCallback, useState, Dispatch, useEffect } from 'react';
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
  Alert,
} from 'react-native';
import gql from 'graphql-tag';
import { useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import client from '../../api/apollo';
import { StationsByNameData, Station } from '../../models/StationAPI';
import { PREFS_JA, PREFS_EN } from '../../constants';
import Heading from '../Heading';
import useStation from '../../hooks/useStation';
import { updateLocationSuccess } from '../../store/actions/location';
import { LocationActionTypes } from '../../store/types/location';
import { isJapanese, translate } from '../../translation';
import FAB from '../FAB';

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
    borderRadius: 4,
    width: '100%',
    marginBottom: 24,
    color: 'black',
  },
  loadingRoot: {
    marginBottom: 24,
  },
  stationNameText: {
    fontSize: 16,
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
    fontSize: 16,
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

const StationNameCell = memo(({ item, onPress }: StationNameCellProps) => {
  const handleOnPress = useCallback(() => {
    onPress(item);
  }, [item, onPress]);
  return (
    <TouchableOpacity style={styles.cell} onPress={handleOnPress}>
      <Text style={styles.stationNameText}>
        {isJapanese ? item.name : item.nameR}
      </Text>
    </TouchableOpacity>
  );
});

const Loading = memo(() => (
  <View style={styles.loadingRoot}>
    <ActivityIndicator size="large" color="#555" />
  </View>
));

const FakeStationSettings: React.FC = () => {
  const [query, setQuery] = useState('');
  const [foundStations, setFoundStations] = useState<Station[]>([]);
  const [loaded, setLoaded] = useState(true);
  const [dirty, setDirty] = useState(false);
  const navigation = useNavigation();

  const onPressBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const triggerChange = useCallback(async () => {
    setFoundStations([]);
    if (!query.length) {
      setLoaded(true);
      return;
    }
    setLoaded(false);
    try {
      const result = await client.query({
        query: gql`
        {
          stationsByName(name: "${query}") {
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
              lineType
            }
          }
        }
      `,
      });
      const data = result.data as StationsByNameData;
      const sorted = data.stationsByName.slice().sort((a, b) => {
        if (a.groupId > b.groupId) {
          return 1;
        }
        if (a.groupId < b.groupId) {
          return -1;
        }
        return 0;
      });
      const grouped = sorted.filter((s, i, arr) => {
        const prev = arr[i - 1] || undefined;
        return s.groupId !== prev?.groupId;
      });
      const mapped = grouped.map((g, i, arr) => {
        const sameNameStations = arr.filter(
          (s) => s.name === g.name || s.nameR === g.nameR
        );
        if (sameNameStations.length > 1) {
          return {
            ...g,
            name: `${g.name}(${PREFS_JA[g.prefId - 1]})`,
            nameR: `${g.nameR}(${PREFS_EN[g.prefId - 1]})`,
          };
        }
        return g;
      });
      setFoundStations(mapped);
    } catch (e) {
      setFoundStations([]);
    } finally {
      setLoaded(true);
    }
  }, [query]);

  const [fetchStationFunc, fetchStationErrors] = useStation();
  const dispatch = useDispatch<Dispatch<LocationActionTypes>>();

  useEffect(() => {
    if (fetchStationErrors?.length) {
      Alert.alert(translate('errorTitle'), translate('failedToFetchStation'), [
        {
          text: 'OK',
          onPress: onPressBack,
        },
      ]);
    }
  }, [fetchStationErrors, onPressBack]);

  const onStationPress = useCallback(
    (station: Station) => {
      const location = {
        coords: {
          latitude: station.latitude,
          longitude: station.longitude,
          altitude: undefined,
          accuracy: undefined,
          heading: undefined,
          speed: undefined,
          altitudeAccuracy: undefined,
        },
      };
      dispatch(updateLocationSuccess(location));
      fetchStationFunc(location);
      onPressBack();
    },
    [dispatch, fetchStationFunc, onPressBack]
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

  const keyExtractor = useCallback((item) => item.id, []);

  const onSubmitEditing = useCallback(() => {
    if (!dirty) {
      setDirty(true);
    }
    triggerChange();
  }, [dirty, triggerChange]);

  const onChange = useCallback(
    (e: NativeSyntheticEvent<TextInputChangeEventData>) => {
      setQuery(e.nativeEvent.text);
    },
    []
  );

  const ListEmptyComponent = memo(() => {
    if (!dirty) {
      return <Text style={styles.emptyText}>{translate('queryEmpty')}</Text>;
    }
    return (
      <Text style={styles.emptyText}>{translate('stationListEmpty')}</Text>
    );
  });

  return (
    <>
      <View style={styles.rootPadding}>
        <Heading style={styles.heading}>
          {translate('specifyStationTitle')}
        </Heading>
        <View style={styles.settingItem}>
          <TextInput
            placeholder={translate('searchByStationNamePlaceholder')}
            value={query}
            style={styles.stationNameInput}
            onChange={onChange}
            onSubmitEditing={onSubmitEditing}
          />
          <View
            style={{
              width: '100%',
              height: '50%',
            }}
          >
            {!loaded && <Loading />}
            {loaded && (
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
        </View>
      </View>
      <FAB onPress={onPressBack} icon="md-save" />
    </>
  );
};

export default memo(FakeStationSettings);
