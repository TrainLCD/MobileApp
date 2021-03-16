import React, { memo, useCallback, useState, useEffect } from 'react';
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
  Keyboard,
  TextInputKeyPressEventData,
  Alert,
} from 'react-native';
import gql from 'graphql-tag';
import { useNavigation } from '@react-navigation/native';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { useLazyQuery } from '@apollo/client';
import { StationsByNameData, Station } from '../../models/StationAPI';
import { PREFS_JA, PREFS_EN } from '../../constants';
import Heading from '../Heading';
import { isJapanese, translate } from '../../translation';
import FAB from '../FAB';
import locationState from '../../store/atoms/location';
import navigationState from '../../store/atoms/navigation';
import calcHubenyDistance from '../../utils/hubeny';
import stationState from '../../store/atoms/station';

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
        {isJapanese ? item.nameForSearch : item.nameForSearchR}
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
  const [dirty, setDirty] = useState(false);
  const navigation = useNavigation();
  const setNavigationState = useSetRecoilState(navigationState);
  const setStation = useSetRecoilState(stationState);
  const setNavigation = useSetRecoilState(navigationState);
  const {
    location: { coords },
  } = useRecoilValue(locationState);

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
          lineType
        }
      }
    }
  `;

  const [
    getStationByName,
    { loading, error, data },
  ] = useLazyQuery<StationsByNameData>(STATION_BY_NAME_TYPE);

  const onPressBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const triggerChange = useCallback(async () => {
    if (!query.length) {
      return;
    }
    getStationByName({
      variables: {
        name: query,
      },
    });
  }, [getStationByName, query]);

  useEffect(() => {
    if (data) {
      const mapped = data.stationsByName
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
            return sameNameStations.reduce((acc, cur) => {
              return {
                ...acc,
                lines: [...acc.lines, ...cur.lines],
              };
            });
          }
          return g;
        })
        .filter(
          (g, i, arr) =>
            arr.findIndex((s) => s.nameForSearch === g.nameForSearch) === i
        )
        .sort((a, b) => {
          const toADistance = calcHubenyDistance(
            { latitude: coords.latitude, longitude: coords.longitude },
            {
              latitude: a.latitude,
              longitude: a.longitude,
            }
          );
          const toBDistance = calcHubenyDistance(
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
    }
  }, [coords.latitude, coords.longitude, data]);

  useEffect(() => {
    if (error) {
      Alert.alert(translate('errorTitle'), translate('apiErrorText'));
    }
  }, [error]);

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

  const onSubmitEditing = useCallback(() => {
    setNavigationState((prev) => ({ ...prev, headerShown: true }));
    if (!dirty) {
      setDirty(true);
    }
    triggerChange();
  }, [dirty, setNavigationState, triggerChange]);

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

  const ListEmptyComponent = memo(() => {
    if (!dirty) {
      return <Text style={styles.emptyText}>{translate('queryEmpty')}</Text>;
    }
    return (
      <Text style={styles.emptyText}>{translate('stationListEmpty')}</Text>
    );
  });

  const handleKeyboardDidHide = useCallback(
    (): void => setNavigationState((prev) => ({ ...prev, headerShown: true })),
    [setNavigationState]
  );

  useEffect(() => {
    Keyboard.addListener('keyboardDidHide', handleKeyboardDidHide);

    return (): void => {
      Keyboard.removeListener('keyboardDidHide', handleKeyboardDidHide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFocus = useCallback(
    (): void => setNavigationState((prev) => ({ ...prev, headerShown: false })),
    [setNavigationState]
  );

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
            onFocus={handleFocus}
          />
          <View
            style={{
              width: '100%',
              height: '50%',
            }}
          >
            {loading && <Loading />}
            {!loading && (
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
      <FAB onPress={onPressBack} icon="md-checkmark" />
    </>
  );
};

export default memo(FakeStationSettings);
