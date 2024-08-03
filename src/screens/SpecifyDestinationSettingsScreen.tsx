import { Picker } from '@react-native-picker/picker'
import { useNavigation } from '@react-navigation/native'
import React, { useCallback, useEffect, useMemo } from 'react'
import { BackHandler, StyleSheet, View } from 'react-native'
import { useRecoilState } from 'recoil'
import { Station, StopCondition } from '../../gen/proto/stationapi_pb'
import FAB from '../components/FAB'
import Heading from '../components/Heading'
import { LED_THEME_BG_COLOR } from '../constants'
import { useCurrentStation } from '../hooks/useCurrentStation'
import { useThemeStore } from '../hooks/useThemeStore'
import { APP_THEME } from '../models/Theme'
import stationState from '../store/atoms/station'
import { isJapanese, translate } from '../translation'
import dropEitherJunctionStation from '../utils/dropJunctionStation'

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 24,
    flex: 1,
    paddingTop: 24,
  },
})

const SpecifyDestinationSettingsScreen: React.FC = () => {
  const [{ wantedDestination, stations }, setStationState] =
    useRecoilState(stationState)
  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED)
  const station = useCurrentStation()

  const stopStations = useMemo(
    () =>
      dropEitherJunctionStation(stations).filter(
        (s) => s.stopCondition !== StopCondition.Not
      ),
    [stations]
  )

  const navigation = useNavigation()

  const items = useMemo(
    () => [
      {
        label: translate('notSpecified'),
        value: 0,
      },
      ...stopStations
        .filter((s) => s.groupId !== station?.groupId)
        .map((s) => ({
          label: isJapanese ? s.name : s.nameRoman ?? '',
          value: s.id,
        })),
    ],
    [station?.groupId, stopStations]
  )

  const slicedStations = useMemo<Station[]>(() => {
    if (!wantedDestination) {
      return stations
    }

    const destinationIndex = stations.findIndex(
      (s) => s.groupId === wantedDestination.groupId
    )
    const currentStationIndex = stations.findIndex(
      (s) => s.groupId === station?.groupId
    )

    if (currentStationIndex < destinationIndex) {
      return stations.slice(0, destinationIndex + 1)
    }
    return stations.slice(destinationIndex)
  }, [stations, station?.groupId, wantedDestination])

  const handlePressFAB = useCallback(() => {
    if (!wantedDestination) {
      setStationState((prev) => ({
        ...prev,
        wantedDestination: null,
        stations: prev.stations,
      }))
      if (navigation.canGoBack()) {
        navigation.goBack()
      }
      return
    }

    setStationState((prev) => ({
      ...prev,
      wantedDestination,
      stations: slicedStations,
    }))

    if (navigation.canGoBack()) {
      navigation.goBack()
    }
  }, [navigation, setStationState, slicedStations, wantedDestination])

  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      handlePressFAB()
      return true
    })
    return (): void => {
      handler.remove()
    }
  }, [handlePressFAB])

  const handleDestinationChange = useCallback(
    (trainTypeId: number) => {
      if (trainTypeId === 0) {
        setStationState((prev) => ({
          ...prev,
          wantedDestination: null,
        }))
        return
      }

      const wantedDestination = stations.find((s) => s.id === trainTypeId)
      if (wantedDestination) {
        setStationState((prev) => ({
          ...prev,
          wantedDestination,
        }))
      }
    },
    [stations, setStationState]
  )

  return (
    <View style={styles.root}>
      <Heading>{translate('selectBoundSettings')}</Heading>
      <Picker
        selectedValue={wantedDestination?.id ?? 0}
        onValueChange={(id) => handleDestinationChange(Number(id))}
        dropdownIconColor={isLEDTheme ? '#fff' : '#000'}
      >
        {items.map((it) => (
          <Picker.Item
            color={isLEDTheme ? '#fff' : '#000'}
            style={{
              backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : undefined,
            }}
            key={it.value}
            label={it.label}
            value={it.value}
          />
        ))}
      </Picker>
      <FAB onPress={handlePressFAB} icon="checkmark" />
    </View>
  )
}

export default React.memo(SpecifyDestinationSettingsScreen)
