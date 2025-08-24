import { StackActions, useNavigation } from '@react-navigation/native';
import findNearest from 'geolib/es/findNearest';
import { useSetAtom } from 'jotai';
import React, { useCallback } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Station } from '~/gen/proto/stationapi_pb';
import FAB from '../components/FAB';
import { Heading } from '../components/Heading';
import Loading from '../components/Loading';
import Typography from '../components/Typography';
import { useCommunityRoutes, useLocationStore, useThemeStore } from '../hooks';
import type { CommunityRoute } from '../models/CommunityRoute';
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
  },
});

const ListEmptyComponent: React.FC = () => (
  <Typography style={styles.emptyText}>
    {translate('savedRoutesEmpty')}
  </Typography>
);

const CommunityRoutesScreen: React.FC = () => {
  const setLineState = useSetAtom(lineState);
  const setNavigationState = useSetAtom(navigationState);
  const setStationState = useSetAtom(stationState);
  const latitude = useLocationStore((state) => state?.coords.latitude);
  const longitude = useLocationStore((state) => state?.coords.longitude);
  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED);
  const navigation = useNavigation();
  const { routes, loading, fetchStationsByRoute } = useCommunityRoutes();

  const onPressBack = useCallback(async () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const updateStateAndNavigate = useCallback(
    (stations: Station[], selectedStation: Station) => {
      const selectedLine = selectedStation.line;
      if (!selectedLine) {
        return;
      }
      setStationState((prev) => ({
        ...prev,
        stations,
        station: selectedStation,
      }));
      setNavigationState((prev) => ({
        ...prev,
        trainType: selectedStation.trainType ?? null,
        leftStations: [],
        stationForHeader: selectedStation,
      }));
      setLineState((prev) => ({
        ...prev,
        selectedLine,
      }));
      navigation.dispatch(
        StackActions.replace('MainStack', { screen: 'SelectBound' })
      );
    },
    [navigation, setLineState, setNavigationState, setStationState]
  );

  const handleItemPress = useCallback(
    async (route: CommunityRoute) => {
      const { stations: fetchedStations } = await fetchStationsByRoute({
        ids: route.stations.map((s) => s.id),
      });

      if (!fetchedStations?.length || !latitude || !longitude) {
        return;
      }
      const stations = fetchedStations.map((sta) => ({
        ...sta,
        stopCondition: route.stations.find((rs) => rs.id === sta.id)
          ?.stopCondition,
        trainType: route.trainType,
      }));

      const nearestCoordinates = findNearest(
        { latitude, longitude },
        stations.map((sta) => ({
          latitude: sta.latitude,
          longitude: sta.longitude,
        }))
      ) as { latitude: number; longitude: number };

      const nearestStation = stations.find(
        (sta) =>
          sta.latitude === nearestCoordinates.latitude &&
          sta.longitude === nearestCoordinates.longitude
      );

      if (!nearestStation) {
        return;
      }
      updateStateAndNavigate(
        stations.map((s) => new Station(s)),
        new Station(nearestStation)
      );
    },
    [fetchStationsByRoute, latitude, longitude, updateStateAndNavigate]
  );

  const renderItem = useCallback(
    ({ item }: { item: CommunityRoute }) => {
      const handlePress = () => handleItemPress(item);
      return (
        <>
          <TouchableOpacity style={styles.item} onPress={handlePress}>
            <Typography style={styles.routeNameText}>{item.name}</Typography>
          </TouchableOpacity>
          <View style={styles.divider} />
        </>
      );
    },
    [handleItemPress]
  );

  const keyExtractor = useCallback(({ id }: CommunityRoute) => id, []);
  const { bottom: safeAreaBottom } = useSafeAreaInsets();

  if (loading) {
    return (
      <Loading message={translate('loadingAPI')} linkType="serverStatus" />
    );
  }

  return (
    <View
      style={{
        ...styles.root,
        backgroundColor: isLEDTheme ? '#212121' : '#fff',
      }}
    >
      <Heading style={styles.heading}>{translate('communityRoutes')}</Heading>

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
    </View>
  );
};

export default React.memo(CommunityRoutesScreen);
