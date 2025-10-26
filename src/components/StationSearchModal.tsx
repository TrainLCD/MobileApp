import { useLazyQuery } from '@apollo/client/react';
import uniqBy from 'lodash/uniqBy';
import { useCallback, useEffect, useMemo } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Station } from '~/@types/graphql';
import { LED_THEME_BG_COLOR } from '~/constants/color';
import { PREFECTURES_JA } from '~/constants/province';
import { useThemeStore } from '~/hooks';
import { GET_STATIONS_BY_NAME } from '~/lib/graphql/queries';
import { APP_THEME } from '~/models/Theme';
import { isJapanese, translate } from '~/translation';
import isTablet from '~/utils/isTablet';
import Button from './Button';
import { EmptyLineSeparator } from './EmptyLineSeparator';
import { EmptyResult } from './EmptyResult';
import { Heading } from './Heading';
import { LineCard } from './LineCard';
import { SearchBar } from './SearchBar';

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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    backgroundColor: '#fff',
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
    backgroundColor: '#fff',
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
  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED);
  const insets = useSafeAreaInsets();

  const [
    fetchStations,
    {
      data: stationsData,
      loading: fetchStationsLoading,
      error: fetchStationsError,
      called: fetchStationsCalled,
    },
  ] = useLazyQuery<GetStationsByNameData, GetStationsByNameVariables>(
    GET_STATIONS_BY_NAME
  );

  useEffect(() => {
    if (fetchStationsError) {
      Alert.alert(translate('errorTitle'), translate('failedToFetchStation'));
    }
  }, [fetchStationsError]);

  const renderItem = useCallback(
    ({ item }: { item: Station }) => {
      const { line, lines } = item;
      if (!line) return null;

      const title = (isJapanese ? item.name : item.nameRoman) || undefined;
      const subtitle = isJapanese
        ? `${(lines ?? []).map((l) => l.nameShort).join('・')}`
        : (lines ?? []).map((l) => l.nameRoman).join(', ');

      return (
        <LineCard
          line={line}
          title={title}
          subtitle={subtitle}
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

      fetchStations({ variables: { name: query } });
    },
    [fetchStations]
  );

  const stations = useMemo(
    () =>
      fetchStationsCalled
        ? uniqBy(stationsData?.stationsByName ?? [], (station) => {
            if (station.groupId) {
              return station.groupId;
            }
            if (station.id) {
              return station.id;
            }
            const prefecture =
              station.prefectureId != null
                ? PREFECTURES_JA[station.prefectureId - 1]
                : '';
            return `${station.name}|${prefecture}`;
          })
        : [],
    [stationsData?.stationsByName, fetchStationsCalled]
  );

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={handleClose}
      supportedOrientations={['portrait', 'landscape']}
    >
      <Pressable style={styles.root} onPress={handleClose}>
        <Pressable
          onPress={() => {}}
          style={[
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
          <View style={styles.headerContainer}>
            <Heading style={styles.title}>
              {translate('searchFirstStationTitle')}
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
            ListEmptyComponent={
              <EmptyResult
                loading={fetchStationsLoading}
                hasSearched={fetchStationsCalled}
              />
            }
          />
          <View style={styles.closeButtonContainer}>
            <Button
              style={styles.closeButton}
              textStyle={styles.closeButtonText}
              onPress={handleClose}
            >
              {translate('close')}
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
