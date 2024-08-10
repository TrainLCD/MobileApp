import { useNavigation } from '@react-navigation/native'
import React, { useCallback, useEffect, useMemo } from 'react'
import { BackHandler, StyleSheet, View } from 'react-native'
import { useRecoilState } from 'recoil'
import { Station, StopCondition } from '../../gen/proto/stationapi_pb'
import FAB from '../components/FAB'
import Heading from '../components/Heading'
import { StationList } from '../components/StationList'
import { useCurrentStation } from '../hooks/useCurrentStation'
import stationState from '../store/atoms/station'
import { translate } from '../translation'
import dropEitherJunctionStation from '../utils/dropJunctionStation'

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 48,
    flex: 1,
    paddingTop: 12,
  },
})

const SpecifyDestinationSettingsScreen: React.FC = () => {
  const [{ stations }, setStationState] = useRecoilState(stationState)
  const currentStation = useCurrentStation()

  const stopStations = useMemo(
    () =>
      dropEitherJunctionStation(stations).filter(
        (s) => s.stopCondition !== StopCondition.Not
      ),
    [stations]
  )

  const navigation = useNavigation()

  const getSlicedStations = useCallback(
    (destination: Station) => {
      const destinationIndex = stations.findIndex(
        (s) => s.groupId === destination.groupId
      )
      const currentStationIndex = stations.findIndex(
        (s) => s.groupId === currentStation?.groupId
      )

      if (currentStationIndex < destinationIndex) {
        return stations.slice(0, destinationIndex + 1)
      }
      return stations.slice(destinationIndex)
    },
    [currentStation?.groupId, stations]
  )

  const handleDestinationPress = useCallback(
    (destination: Station) => {
      setStationState((prev) => ({
        ...prev,
        wantedDestination: destination,
        stations: getSlicedStations(destination),
      }))
      if (navigation.canGoBack()) {
        navigation.goBack()
      }
    },
    [getSlicedStations, navigation, setStationState]
  )

  const handlePressFAB = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack()
    }
  }, [navigation])

  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      handlePressFAB()
      return true
    })
    return (): void => {
      handler.remove()
    }
  }, [handlePressFAB])

  return (
    <View style={styles.root}>
      <Heading>{translate('selectBoundSettings')}</Heading>
      <StationList data={stopStations} onSelect={handleDestinationPress} />
      <FAB onPress={handlePressFAB} icon="checkmark" />
    </View>
  )
}

export default React.memo(SpecifyDestinationSettingsScreen)
