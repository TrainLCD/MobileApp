import { useLazyQuery, useQuery } from '@apollo/client/react';
import { useAtomValue } from 'jotai';
import uniqBy from 'lodash/uniqBy';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Platform, StyleSheet, View } from 'react-native';
import { NEARBY_STATIONS_LIMIT } from 'react-native-dotenv';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type {
  GetStationsNearbyQueryVariables,
  Station,
} from '~/@types/graphql';
import { LED_THEME_BG_COLOR } from '~/constants/color';
import { PREFECTURES_JA } from '~/constants/province';
import { useFetchCurrentLocationOnce } from '~/hooks/useFetchCurrentLocationOnce';
import {
  GET_STATIONS_BY_NAME,
  GET_STATIONS_NEARBY,
} from '~/lib/graphql/queries';
import { locationAtom, setLocation } from '~/store/atoms/location';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { isJapanese, translate } from '~/translation';
import isTablet from '~/utils/isTablet';
import { filterBusLinesForNonBusStation } from '~/utils/line';
import Button from './Button';
import { CommonCard } from './CommonCard';
import { CustomModal } from './CustomModal';
import { EmptyLineSeparator } from './EmptyLineSeparator';
import { EmptyResult } from './EmptyResult';
import { Heading } from './Heading';
import { SearchBar } from './SearchBar';

type GetStationsNearbyData = {
  stationsNearby: Station[];
};

type GetStationsByNameData = {
  stationsByName: Station[];
};

type GetStationsByNameVariables = {
  name: string;
  limit?: number;
  fromStationGroupId?: number;
};

const getStationUniqueKey = (station: Station) => {
  if (station.groupId) {
    return `${station.groupId}|${station.name}`;
  }
  if (station.id) {
    return String(station.id);
  }
  const prefId = station.prefectureId;
  if (!prefId || prefId < 1) {
    return station.name;
  }
  return `${station.name}|${PREFECTURES_JA[prefId - 1]}`;
};

const getUniqueStations = (stations?: Station[]) =>
  uniqBy(stations ?? [], getStationUniqueKey);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  contentView: {
    width: '100%',
    borderRadius: 8,
    minHeight: 512,
    overflow: 'hidden',
  },
  closeButtonContainer: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: '100%',
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  closeButton: { width: '100%' },
  closeButtonText: { fontWeight: 'bold' },
  headerContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    zIndex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 21,
  },
  subtitle: { width: '100%', fontSize: 16 },
  title: {
    width: '100%',
    marginBottom: 24,
  },
  flatListContentContainer: {
    paddingHorizontal: 24,
    paddingTop: 150,
    paddingBottom: 72,
  },
  noSearchResulText: {
    fontWeight: 'bold',
  },
});

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (trainType: Station) => void;
};

export const StationSearchModal = ({ visible, onClose, onSelect }: Props) => {
  const { fetchCurrentLocation } = useFetchCurrentLocationOnce();
  const wasVisibleRef = useRef(false);
  const location = useAtomValue(locationAtom);
  const [modalCoords, setModalCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const latitude = modalCoords?.latitude ?? location?.coords.latitude;
  const longitude = modalCoords?.longitude ?? location?.coords.longitude;

  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const insets = useSafeAreaInsets();

  const {
    data: stationsNearbyData,
    loading: fetchStationsNearbyLoading,
    error: fetchStationsNearbyError,
  } = useQuery<GetStationsNearbyData>(GET_STATIONS_NEARBY, {
    skip: !visible || latitude == null || longitude == null,
    variables: {
      latitude: latitude as number,
      longitude: longitude as number,
      limit: Number(NEARBY_STATIONS_LIMIT ?? 10),
    } as GetStationsNearbyQueryVariables,
  });

  const [
    fetchStationsByName,
    {
      data: stationsByNameData,
      loading: fetchStationsByNameLoading,
      error: fetchStationsByNameError,
      called: fetchStationsByNameCalled,
    },
  ] = useLazyQuery<GetStationsByNameData, GetStationsByNameVariables>(
    GET_STATIONS_BY_NAME
  );

  useEffect(() => {
    if (!visible) {
      setModalCoords(null);
      wasVisibleRef.current = false;
      return;
    }
    if (wasVisibleRef.current) return;
    wasVisibleRef.current = true;

    let active = true;
    const refreshLocation = async () => {
      try {
        const currentLocation = await fetchCurrentLocation();
        if (!active) return;
        setModalCoords({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });
        setLocation(currentLocation);
      } catch (error) {
        console.error(error);
      }
    };

    refreshLocation();
    return () => {
      active = false;
    };
  }, [visible, fetchCurrentLocation]);

  useEffect(() => {
    if (fetchStationsByNameError || fetchStationsNearbyError) {
      Alert.alert(translate('errorTitle'), translate('failedToFetchStation'));
    }
  }, [fetchStationsByNameError, fetchStationsNearbyError]);

  const renderItem = useCallback(
    ({ item }: { item: Station }) => {
      const { line, lines: linesRaw } = item;
      const lines = filterBusLinesForNonBusStation(line, linesRaw);
      if (!line) return null;

      const title = (isJapanese ? item.name : item.nameRoman) || undefined;
      const subtitle = isJapanese
        ? Array.from(new Set((lines ?? []).map((l) => l.nameShort))).join(' ')
        : Array.from(new Set((lines ?? []).map((l) => l.nameRoman))).join(', ');

      return (
        <CommonCard
          targetStation={item}
          line={line}
          title={title}
          subtitle={subtitle}
          subtitleNumberOfLines={1}
          onPress={() => {
            onSelect(item);
          }}
        />
      );
    },
    [onSelect]
  );

  const keyExtractor = useCallback(
    (s: Station, index: number) => `${s.groupId ?? 0}-${s.id ?? index}`,
    []
  );

  const handleSearchStations = useCallback(
    (query: string) => {
      if (!query.trim().length) {
        return;
      }

      fetchStationsByName({ variables: { name: query } });
    },
    [fetchStationsByName]
  );

  const stations = useMemo(
    () =>
      fetchStationsByNameCalled
        ? getUniqueStations(stationsByNameData?.stationsByName)
        : getUniqueStations(stationsNearbyData?.stationsNearby),
    [
      stationsNearbyData?.stationsNearby,
      stationsByNameData?.stationsByName,
      fetchStationsByNameCalled,
    ]
  );

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <CustomModal
      visible={visible}
      onClose={handleClose}
      backdropStyle={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      containerStyle={styles.root}
      contentContainerStyle={[
        styles.contentView,
        {
          backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : '#fff',
          marginBottom: insets.bottom || 0,
        },
        isTablet && {
          width: '80%',
          maxHeight: '90%',
          borderRadius: 16,
        },
      ]}
    >
      <View
        style={[
          styles.headerContainer,
          {
            backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : '#fff',
          },
        ]}
      >
        <Heading style={styles.title}>
          {translate('searchByStationName')}
        </Heading>
        <SearchBar onSearch={handleSearchStations} nameSearch />
      </View>

      <FlatList<Station>
        style={StyleSheet.absoluteFill}
        data={stations ?? []}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ItemSeparatorComponent={EmptyLineSeparator}
        scrollEventThrottle={16}
        contentContainerStyle={styles.flatListContentContainer}
        removeClippedSubviews={Platform.OS === 'android'}
        ListEmptyComponent={
          <EmptyResult
            loading={fetchStationsNearbyLoading || fetchStationsByNameLoading}
            hasSearched={fetchStationsByNameCalled}
          />
        }
      />
      <View
        style={[
          styles.closeButtonContainer,
          {
            backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : '#fff',
          },
        ]}
      >
        <Button
          style={styles.closeButton}
          textStyle={styles.closeButtonText}
          onPress={handleClose}
        >
          {translate('close')}
        </Button>
      </View>
    </CustomModal>
  );
};
