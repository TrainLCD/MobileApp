import { StackActions, useNavigation } from '@react-navigation/native';
import findNearest from 'geolib/es/findNearest';
import React, { useCallback } from 'react';
import {
  FlatList,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSetRecoilState } from 'recoil';
import { Station } from '../../gen/proto/stationapi_pb';
import FAB from '../components/FAB';
import Heading from '../components/Heading';
import Loading from '../components/Loading';
import Typography from '../components/Typography';
import { useLocationStore } from '../hooks/useLocationStore';
import { useSavedRoutes } from '../hooks/useSavedRoutes';
import { useThemeStore } from '../hooks/useThemeStore';
import type { SavedRoute } from '../models/SavedRoute';
import { APP_THEME } from '../models/Theme';
import lineState from '../store/atoms/line';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { translate } from '../translation';
import { RFValue } from '../utils/rfValue';

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: RFValue(14),
    fontWeight: 'bold',
  },
  heading: {
    marginVertical: 24,
  },
  list: {
    borderWidth: 1,
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
    padding: 12,
  },
});

const ListEmptyComponent: React.FC = () => (
  <Typography style={styles.emptyText}>
    {translate('savedRoutesEmpty')}
  </Typography>
);

const SavedRoutesScreen: React.FC = () => {
  const setLineState = useSetRecoilState(lineState);
  const setNavigationState = useSetRecoilState(navigationState);
  const setStationState = useSetRecoilState(stationState);
  const latitude = useLocationStore((state) => state?.coords.latitude);
  const longitude = useLocationStore((state) => state?.coords.longitude);
  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED);
  const navigation = useNavigation();
  const { routes, loading, fetchStationsByRoute } = useSavedRoutes();

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
        fromBuilder: true,
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
    async (route: SavedRoute) => {
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
    ({ item }: { item: SavedRoute }) => {
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

  const keyExtractor = useCallback(({ id }: SavedRoute) => id, []);

  if (loading) {
    return (
      <Loading message={translate('loadingAPI')} linkType="serverStatus" />
    );
  }

  return (
    <>
      <SafeAreaView
        style={{
          ...styles.root,
          backgroundColor: isLEDTheme ? '#212121' : '#fff',
        }}
      >
        <View style={styles.content}>
          <Heading style={styles.heading}>{translate('savedRoutes')}</Heading>

          <FlatList
            style={{
              ...styles.list,
              borderColor: isLEDTheme ? '#fff' : '#aaa',
            }}
            data={routes}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            ListEmptyComponent={ListEmptyComponent}
          />
        </View>
      </SafeAreaView>

      <FAB onPress={onPressBack} icon="close" />
    </>
  );
};

export default React.memo(SavedRoutesScreen);
