import { useNavigation } from '@react-navigation/native'
import findNearest from 'geolib/es/findNearest'
import React, { useCallback } from 'react'
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native'
import { RFValue } from 'react-native-responsive-fontsize'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import FAB from '../components/FAB'
import Heading from '../components/Heading'
import Loading from '../components/Loading'
import Typography from '../components/Typography'
import { Station } from '../gen/stationapi_pb'
import { useIsLEDTheme } from '../hooks/useIsLEDTheme'
import { useSavedRoutes } from '../hooks/useSavedRoutes'
import { SavedRoute } from '../models/SavedRoute'
import lineState from '../store/atoms/line'
import locationState from '../store/atoms/location'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import { translate } from '../translation'

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 24,
    flex: 1,
    paddingTop: 24,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: RFValue(14),
    fontWeight: 'bold',
  },
  rootPadding: {
    padding: 72,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  heading: {
    marginBottom: 24,
  },
  listContainer: {
    width: '50%',
    height: '75%',
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
})

const ListEmptyComponent: React.FC = () => (
  <Typography style={styles.emptyText}>
    {translate('savedRoutesEmpty')}
  </Typography>
)

const SavedRoutesScreen: React.FC = () => {
  const setLineState = useSetRecoilState(lineState)
  const setNavigationState = useSetRecoilState(navigationState)
  const setStationState = useSetRecoilState(stationState)
  const { location } = useRecoilValue(locationState)

  const isLEDTheme = useIsLEDTheme()
  const navigation = useNavigation()
  const { routes, loading, fetchStationsByRoute } = useSavedRoutes()

  const onPressBack = useCallback(async () => {
    if (navigation.canGoBack()) {
      navigation.goBack()
    }
  }, [navigation])

  const updateStateAndNavigate = useCallback(
    (stations: Station.AsObject[], selectedStation: Station.AsObject) => {
      const selectedLine = selectedStation.line
      if (!selectedLine) {
        return
      }
      setStationState((prev) => ({
        ...prev,
        stations,
        station: selectedStation,
      }))
      setNavigationState((prev) => ({
        ...prev,
        trainType: selectedStation.trainType ?? null,
        leftStations: [],
        stationForHeader: selectedStation,
        fromBuilder: true,
      }))
      setLineState((prev) => ({
        ...prev,
        selectedLine,
      }))
      navigation.navigate('SelectBound')
    },
    [navigation, setLineState, setNavigationState, setStationState]
  )

  const handleItemPress = useCallback(
    async (route: SavedRoute) => {
      const stations = await fetchStationsByRoute(route)

      if (!stations?.length || !location) {
        return
      }

      const { latitude, longitude } = location.coords

      const nearestCoordinates = findNearest(
        { latitude, longitude },
        stations.map((sta) => ({
          latitude: parseFloat(sta.latitude.toString()).toPrecision(5),
          longitude: parseFloat(sta.longitude.toString()).toPrecision(5),
        }))
      ) as { latitude: number; longitude: number }

      const nearestStation = stations.find(
        (sta) =>
          parseFloat(sta.latitude.toString()).toPrecision(5) ===
            nearestCoordinates.latitude.toString() &&
          parseFloat(sta.longitude.toString()).toPrecision(5) ===
            nearestCoordinates.longitude.toString()
      )

      if (!nearestStation) {
        return
      }
      updateStateAndNavigate(stations, nearestStation)
    },
    [fetchStationsByRoute, location, updateStateAndNavigate]
  )

  const renderItem = useCallback(
    ({ item }: { item: SavedRoute }) => {
      const handlePress = () => handleItemPress(item)
      return (
        <>
          <TouchableOpacity style={styles.item} onPress={handlePress}>
            <Typography style={styles.routeNameText}>{item.name}</Typography>
          </TouchableOpacity>
          <View style={styles.divider} />
        </>
      )
    },
    [handleItemPress]
  )
  const keyExtractor = useCallback(({ id }: SavedRoute) => id, [])

  return (
    <>
      <View
        style={{
          ...styles.rootPadding,
          backgroundColor: isLEDTheme ? '#212121' : '#fff',
        }}
      >
        <Heading style={styles.heading}>{translate('savedRoutes')}</Heading>

        <View style={styles.listContainer}>
          {loading && <Loading />}
          {!loading && (
            <FlatList
              style={{
                borderColor: isLEDTheme ? '#fff' : '#aaa',
                borderWidth: routes.length ? 1 : 0,
              }}
              data={routes}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              ListEmptyComponent={ListEmptyComponent}
            />
          )}
        </View>
      </View>

      <FAB onPress={onPressBack} icon="md-close" />
    </>
  )
}

export default React.memo(SavedRoutesScreen)
