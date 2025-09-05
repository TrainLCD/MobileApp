import { useMutation } from '@connectrpc/connect-query';
import { Ionicons } from '@expo/vector-icons';
import { StackActions, useNavigation } from '@react-navigation/native';
import findNearest from 'geolib/es/findNearest';
import { useAtom, useSetAtom } from 'jotai';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SavedRouteInfoModal } from '~/components/SavedRouteInfoModal';
import type { TrainType } from '~/gen/proto/stationapi_pb';
import {
  getStationsByLineGroupId,
  getStationsByLineId,
  getTrainTypesByStationId,
} from '~/gen/proto/stationapi-StationAPI_connectquery';
import type { SavedRoute } from '~/models/SavedRoute';
import FAB from '../components/FAB';
import { Heading } from '../components/Heading';
import Typography from '../components/Typography';
import { useLocationStore, useSavedRoutes, useThemeStore } from '../hooks';
import { APP_THEME } from '../models/Theme';
import lineState from '../store/atoms/line';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { translate } from '../translation';
import { RFValue } from '../utils/rfValue';

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 48,
    paddingVertical: 12,
    flex: 1,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: RFValue(14),
    fontWeight: 'bold',
  },
  heading: {
    marginBottom: 24,
  },
  listContainer: {
    width: '65%',
    height: '100%',
    alignSelf: 'center',
  },
  routeNameText: {
    fontSize: RFValue(14),
  },
  divider: {
    height: 1,
    width: '100%',
    backgroundColor: '#aaa',
  },
  item: {
    flex: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deleteContainer: {
    width: 32,
    height: 32,
    backgroundColor: 'crimson',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const ListEmptyComponent: React.FC = () => (
  <Typography style={styles.emptyText}>
    {translate('savedRoutesEmpty')}
  </Typography>
);

const SavedRoutesScreen: React.FC = () => {
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<SavedRoute | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const setLineState = useSetAtom(lineState);
  const [{ trainType }, setNavigationState] = useAtom(navigationState);
  const [{ stations }, setStationState] = useAtom(stationState);
  const latitude = useLocationStore((state) => state?.coords.latitude);
  const longitude = useLocationStore((state) => state?.coords.longitude);
  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED);
  const navigation = useNavigation();
  const { getAll, remove, isInitialized } = useSavedRoutes();

  const {
    mutateAsync: fetchStationsByLineId,
    status: fetchStationsByLineIdStatus,
    error: fetchStationsByLineIdError,
  } = useMutation(getStationsByLineId);
  const {
    mutateAsync: fetchStationsByLineGroupId,
    status: fetchStationsByLineGroupIdStatus,
    error: fetchStationsByLineGroupIdError,
  } = useMutation(getStationsByLineGroupId);

  const {
    mutateAsync: fetchTrainTypes,
    status: fetchTrainTypesStatus,
    error: fetchTrainTypesError,
  } = useMutation(getTrainTypesByStationId);

  useEffect(() => {
    const fetchRoutes = async () => {
      if (!isInitialized) return;
      const savedRoutes = await getAll();
      setRoutes(savedRoutes);
    };
    fetchRoutes();
  }, [getAll, isInitialized]);

  const onPressBack = useCallback(async () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const openModalByLineId = useCallback(
    async (lineId: number, destinationStationId: number | null) => {
      const { stations } = await fetchStationsByLineId({
        lineId,
      });
      if (!stations.length) {
        return;
      }

      const wantedDestination =
        stations.find((sta) => sta.groupId === destinationStationId) ?? null;

      const nearestCoordinates = findNearest(
        {
          latitude: latitude ?? stations[0].latitude,
          longitude: longitude ?? stations[0].longitude,
        },
        stations.map((sta) => ({
          latitude: sta.latitude,
          longitude: sta.longitude,
        }))
      ) as { latitude: number; longitude: number };

      const station = stations.find(
        (sta) =>
          sta.latitude === nearestCoordinates.latitude &&
          sta.longitude === nearestCoordinates.longitude
      );

      if (!station) {
        return;
      }

      setStationState((prev) => ({
        ...prev,
        station,
        stations,
        wantedDestination,
      }));
      setNavigationState((prev) => ({
        ...prev,
        stationForHeader: station,
        leftStations: [],
        trainType: null,
      }));
      setLineState((prev) => ({
        ...prev,
        selectedLine: station.line ?? null,
      }));
    },
    [
      latitude,
      longitude,
      fetchStationsByLineId,
      setNavigationState,
      setLineState,
      setStationState,
    ]
  );

  const openModalByTrainTypeId = useCallback(
    async (lineGroupId: number, destinationStationId: number | null) => {
      const { stations } = await fetchStationsByLineGroupId({
        lineGroupId,
      });

      if (!stations.length) {
        return;
      }

      const wantedDestination =
        stations.find((sta) => sta.groupId === destinationStationId) ?? null;

      const nearestCoordinates = findNearest(
        {
          latitude: latitude ?? stations[0].latitude,
          longitude: longitude ?? stations[0].longitude,
        },
        stations.map((sta) => ({
          latitude: sta.latitude,
          longitude: sta.longitude,
        }))
      ) as { latitude: number; longitude: number };

      const station = stations.find(
        (sta) =>
          sta.latitude === nearestCoordinates.latitude &&
          sta.longitude === nearestCoordinates.longitude
      );

      if (!station) {
        return;
      }

      setIsModalOpen(true);

      const { trainTypes } = await fetchTrainTypes({ stationId: station.id });
      const trainType =
        trainTypes.find((tt) => tt.groupId === lineGroupId) ?? null;

      setStationState((prev) => ({
        ...prev,
        station,
        stations,
        wantedDestination,
      }));
      setNavigationState((prev) => ({
        ...prev,
        stationForHeader: station,
        leftStations: [],
        trainType,
      }));
      setLineState((prev) => ({
        ...prev,
        selectedLine: trainType?.line ?? null,
      }));
    },
    [
      latitude,
      longitude,
      fetchStationsByLineGroupId,
      setNavigationState,
      setLineState,
      setStationState,
      fetchTrainTypes,
    ]
  );

  const handleItemPress = useCallback(
    async (route: SavedRoute) => {
      setSelectedRoute(route);
      setIsModalOpen(true);
      if (route.hasTrainType) {
        openModalByTrainTypeId(
          route.trainTypeId,
          route.destinationStationId ?? null
        );
      } else {
        openModalByLineId(route.lineId, route.destinationStationId ?? null);
      }
    },
    [openModalByLineId, openModalByTrainTypeId]
  );

  const handleDeletePress = useCallback(
    async (route: SavedRoute) => {
      Alert.alert(
        translate('removeFromSavedRoutes'),
        translate('confirmDeleteRouteText', { routeName: route.name }),
        [
          {
            text: 'OK',
            style: 'destructive',
            onPress: async () => {
              await remove(route.id);
              setRoutes((prev) => prev.filter((r) => r.id !== route.id));
              Alert.alert(
                translate('announcementTitle'),
                translate('routeDeletedText', {
                  routeName: route.name,
                })
              );
            },
          },
          {
            text: translate('cancel'),
            style: 'cancel',
          },
        ]
      );
    },
    [remove]
  );

  const renderItem = useCallback(
    ({ item }: { item: SavedRoute }) => {
      const handlePress = () => handleItemPress(item);
      const handleDelete = () => handleDeletePress(item);
      return (
        <>
          <TouchableOpacity style={styles.item} onPress={handlePress}>
            <Typography style={styles.routeNameText}>{item.name}</Typography>
            <Pressable
              style={styles.deleteContainer}
              onPress={(event) => {
                event.stopPropagation();
                handleDelete();
              }}
            >
              <Ionicons name="trash" color="white" size={16} />
            </Pressable>
          </TouchableOpacity>
          <View style={styles.divider} />
        </>
      );
    },
    [handleItemPress, handleDeletePress]
  );

  const keyExtractor = useCallback(({ id }: SavedRoute) => id, []);
  const { bottom: safeAreaBottom } = useSafeAreaInsets();

  const handleCloseModal = () => setIsModalOpen(false);

  const handleRouteConfirmed = useCallback(
    (_trainType?: TrainType, _asTerminus?: boolean) =>
      navigation.dispatch(
        StackActions.replace('MainStack', { screen: 'SelectBound' })
      ),
    [navigation]
  );

  return (
    <View
      style={{
        ...styles.root,
        backgroundColor: isLEDTheme ? '#212121' : '#fff',
      }}
    >
      <Heading style={styles.heading}>{translate('savedRoutes')}</Heading>

      <FlatList
        style={{
          width: '65%',
          alignSelf: 'center',
          borderColor: isLEDTheme ? '#fff' : '#aaa',
          borderWidth: 1,
          flex: 1,
          marginBottom: safeAreaBottom,
        }}
        data={routes}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListEmptyComponent={ListEmptyComponent}
      />

      <FAB onPress={onPressBack} icon="close" />

      <SavedRouteInfoModal
        visible={isModalOpen}
        trainType={trainType}
        stations={stations}
        loading={
          fetchStationsByLineIdStatus === 'pending' ||
          fetchTrainTypesStatus === 'pending' ||
          fetchStationsByLineGroupIdStatus === 'pending'
        }
        error={
          fetchStationsByLineIdError ||
          fetchTrainTypesError ||
          fetchStationsByLineGroupIdError
        }
        routeName={selectedRoute?.name ?? ''}
        onClose={handleCloseModal}
        onConfirmed={handleRouteConfirmed}
      />
    </View>
  );
};

export default React.memo(SavedRoutesScreen);
