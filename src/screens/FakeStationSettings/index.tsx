import i18n from 'i18n-js';
import React, { memo, useCallback, Dispatch, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  PlatformIOSStatic,
  TextInputChangeEventData,
  NativeSyntheticEvent,
} from 'react-native';
import { connect } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { LocationData } from 'expo-location';
import gql from 'graphql-tag';
import client from '../../api/apollo';
import Button from '../../components/Button';
import { updateLocationSuccess } from '../../store/actions/location';
import { StationsByNameData, Station } from '../../models/StationAPI';
import { PREFS_JA, PREFS_EN } from '../../constants';
import { fetchStationAsync } from '../../store/actions/stationAsync';

const { isPad } = Platform as PlatformIOSStatic;

interface Props {
  updateLocation: (location: Pick<LocationData, 'coords'>) => void;
  fetchStation: (location: Pick<LocationData, 'coords'>) => void;
}

const styles = StyleSheet.create({
  rootPadding: {
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingItem: {
    width: isPad ? '25%' : '50%',
  },
  stationNameInput: {
    borderWidth: 1,
    borderColor: '#aaa',
    padding: 12,
    borderRadius: 4,
    width: '100%',
    marginBottom: 24,
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
        {i18n.locale === 'ja' ? item.name : item.nameR}
      </Text>
    </TouchableOpacity>
  );
});

const Loading = memo(() => (
  <View style={styles.loadingRoot}>
    <ActivityIndicator size="large" />
  </View>
));

const FakeStationSettingsScreen: React.FC<Props> = ({
  updateLocation,
  fetchStation,
}: Props) => {
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<Station[]>([]);
  const [loaded, setLoaded] = useState(true);
  const navigation = useNavigation();

  const onPressBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const triggerChange = useCallback(async () => {
    setFound([]);
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
      const sorted = data.stationsByName.sort((a, b) => {
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
      setFound(mapped);
    } catch (e) {
      console.error(e);
      setFound([]);
    } finally {
      setLoaded(true);
    }
  }, [query]);

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
        },
      };
      updateLocation(location);
      fetchStation(location);
    },
    [fetchStation, updateLocation]
  );

  const renderStationNameCell = useCallback(
    ({ item }: { item: Station }) => (
      <>
        <StationNameCell onPress={onStationPress} item={item} />
        <View style={styles.divider} />
      </>
    ),
    [onStationPress]
  );

  const keyExtractor = useCallback((item) => item.id, []);

  const onSubmitEditing = useCallback(() => {
    triggerChange();
  }, [triggerChange]);

  const onChange = useCallback(
    (e: NativeSyntheticEvent<TextInputChangeEventData>) => {
      setQuery(e.nativeEvent.text);
    },
    []
  );

  return (
    <View style={styles.rootPadding}>
      <View style={styles.settingItem}>
        <TextInput
          placeholder={i18n.t('searchByStationNamePlaceholder')}
          value={query}
          style={styles.stationNameInput}
          onChange={onChange}
          onSubmitEditing={onSubmitEditing}
        />
        <View
          style={{
            width: '100%',
            height: '60%',
          }}
        >
          <ScrollView style={{ borderWidth: 1, borderColor: '#aaa' }}>
            {!loaded && <Loading />}
            {loaded && (
              <FlatList
                data={found}
                renderItem={renderStationNameCell}
                keyExtractor={keyExtractor}
              />
            )}
          </ScrollView>
        </View>
      </View>
      <Button onPress={onPressBack}>{i18n.t('back')}</Button>
    </View>
  );
};

const mapDispatchToProps = (
  dispatch: Dispatch<unknown>
): {
  updateLocation: (location: Pick<LocationData, 'coords'>) => void;
  fetchStation: (location: LocationData) => void;
} => ({
  updateLocation: (location: LocationData): void =>
    dispatch(updateLocationSuccess(location)),
  fetchStation: (location: LocationData): void =>
    dispatch(fetchStationAsync(location)),
});

const connected = connect(
  null,
  mapDispatchToProps as unknown
)(FakeStationSettingsScreen);

export default memo(connected);
