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
  TextInputChangeEventData,
  NativeSyntheticEvent,
} from 'react-native';
import { connect } from 'react-redux';
import { LocationData } from 'expo-location';
import gql from 'graphql-tag';
import client from '../../api/apollo';
import { updateLocationSuccess } from '../../store/actions/location';
import { StationsByNameData, Station } from '../../models/StationAPI';
import { PREFS_JA, PREFS_EN } from '../../constants';
import { fetchStationAsync } from '../../store/actions/stationAsync';
import Heading from '../Heading';
import Button from '../Button';
import getTranslatedText from '../../utils/translate';

interface Props {
  updateLocation?: (location: Pick<LocationData, 'coords'>) => void;
  fetchStation?: (location: Pick<LocationData, 'coords'>) => void;
  onRequestClose: () => void;
}

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
  scrollView: {
    borderWidth: 1,
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

const FakeStationSettings: React.FC<Props> = ({
  updateLocation,
  fetchStation,
  onRequestClose,
}: Props) => {
  const [query, setQuery] = useState('');
  const [foundStations, setFoundStations] = useState<Station[]>([]);
  const [loaded, setLoaded] = useState(true);
  const [dirty, setDirty] = useState(false);

  const onPressBack = useCallback(() => {
    onRequestClose();
  }, [onRequestClose]);

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
      setFoundStations(mapped);
    } catch (e) {
      console.error(e);
      setFoundStations([]);
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
      return <></>;
    }
    return (
      <Text style={styles.emptyText}>
        {getTranslatedText('stationListEmpty')}
      </Text>
    );
  });

  return (
    <ScrollView contentContainerStyle={styles.rootPadding}>
      <Heading style={styles.heading}>
        {getTranslatedText('specifyStationTitle')}
      </Heading>
      <View style={styles.settingItem}>
        <TextInput
          placeholder={getTranslatedText('searchByStationNamePlaceholder')}
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
          <ScrollView style={styles.scrollView}>
            {!loaded && <Loading />}
            {loaded && (
              <FlatList
                data={foundStations}
                renderItem={renderStationNameCell}
                keyExtractor={keyExtractor}
                ListEmptyComponent={ListEmptyComponent}
              />
            )}
          </ScrollView>
        </View>
        <Button style={styles.backButton} onPress={onPressBack}>
          {getTranslatedText('back')}
        </Button>
      </View>
    </ScrollView>
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
)(FakeStationSettings);

export default memo(connected);
