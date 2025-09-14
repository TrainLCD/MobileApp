import { useMutation } from '@connectrpc/connect-query';
import uniqBy from 'lodash/uniqBy';
import { useCallback, useMemo } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { LED_THEME_BG_COLOR } from '~/constants/color';
import type { Station } from '~/gen/proto/stationapi_pb';
import { getStationsByName } from '~/gen/proto/stationapi-StationAPI_connectquery';
import { useThemeStore } from '~/hooks';
import { APP_THEME } from '~/models/Theme';
import { isJapanese, translate } from '~/translation';
import isTablet from '~/utils/isTablet';
import Button from './Button';
import { EmptyLineSeparator } from './EmptyLineSeparator';
import { Heading } from './Heading';
import { LineCard } from './LineCard';
import { SearchBar } from './SearchBar';
import Typography from './Typography';

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
    height: 72,
    zIndex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#fff',
  },
  subtitle: { width: '100%', textAlign: 'left', fontSize: 16 },
  title: {
    width: '100%',
    textAlign: 'left',
  },
  flatListContentContainer: {
    paddingHorizontal: 24,
    paddingVertical: 72,
  },
  searchBarContainer: {
    marginBottom: 24,
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

  const {
    data: stationsData,
    mutate: mutateStations,
    status: mutateStationsStatus,
    error: _mutateStationsError,
    reset: resetStations,
  } = useMutation(getStationsByName);

  const renderItem = useCallback(
    ({ item }: { item: Station }) => {
      const { line, lines } = item;
      if (!line) return null;

      const title = isJapanese ? item.name : item.nameRoman;
      const subtitle = isJapanese
        ? `${lines.map((l) => l.nameShort).join('・')}`
        : lines.map((l) => l.nameRoman).join(', ');

      return (
        <LineCard
          line={line}
          title={title}
          subtitle={subtitle}
          onPress={() => onSelect(item)}
        />
      );
    },
    [onSelect]
  );

  const keyExtractor = useCallback((s: Station) => s.groupId.toString(), []);

  const handleSearchStations = useCallback(
    (query: string) => {
      if (!query.trim().length) {
        resetStations();
        return;
      }

      mutateStations({ stationName: query });
    },
    [mutateStations, resetStations]
  );

  const stations = useMemo(
    () => uniqBy(stationsData?.stations ?? [], 'groupId'),
    [stationsData?.stations]
  );

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
      supportedOrientations={['portrait', 'landscape']}
    >
      <Pressable style={styles.root} onPress={onClose}>
        <Pressable
          style={[
            styles.contentView,
            {
              backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : '#fff',
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
          </View>

          <FlatList<Station>
            style={StyleSheet.absoluteFill}
            data={stations ?? []}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            ItemSeparatorComponent={EmptyLineSeparator}
            scrollEventThrottle={16}
            contentContainerStyle={styles.flatListContentContainer}
            ListHeaderComponent={
              <View style={styles.searchBarContainer}>
                <SearchBar onSearch={handleSearchStations} />
              </View>
            }
            ListEmptyComponent={
              mutateStationsStatus === 'pending' ? (
                <SkeletonPlaceholder borderRadius={4} speed={1500}>
                  <SkeletonPlaceholder.Item width="100%" height={72} />
                </SkeletonPlaceholder>
              ) : (
                <Typography style={styles.noSearchResulText}>
                  {translate('emptySearchResult')}
                </Typography>
              )
            }
          />
          <View style={styles.closeButtonContainer}>
            <Button
              style={styles.closeButton}
              textStyle={styles.closeButtonText}
              onPress={onClose}
            >
              {translate('close')}
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
