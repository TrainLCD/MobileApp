import { Picker } from '@react-native-picker/picker'
import { useNavigation } from '@react-navigation/native'
import React, { useCallback, useEffect, useMemo } from 'react'
import { BackHandler, StyleSheet, View } from 'react-native'
import { useRecoilState } from 'recoil'
import FAB from '../components/FAB'
import Heading from '../components/Heading'
import { Station, StopCondition } from '../gen/stationapi_pb'
import useCurrentStation from '../hooks/useCurrentStation'
import { useIsLEDTheme } from '../hooks/useIsLEDTheme'
import stationState from '../store/atoms/station'
import { isJapanese, translate } from '../translation'
import dropEitherJunctionStation from '../utils/dropJunctionStation'
import { LED_THEME_BG_COLOR } from '../constants'

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 24,
    flex: 1,
    paddingTop: 24,
  },
})

const SpecifyDestinationSettingsScreen: React.FC = () => {
  const [{ wantedDestination, allStations }, setStationState] =
    useRecoilState(stationState)

  const station = useCurrentStation()

  const stopStations = useMemo(
    () =>
      dropEitherJunctionStation(allStations).filter(
        (s) => s.stopCondition !== StopCondition.NOT
      ),
    [allStations]
  )

  const navigation = useNavigation()
  const isLEDTheme = useIsLEDTheme()

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

  const slicedStations = useMemo<Station.AsObject[]>(() => {
    if (!wantedDestination) {
      return allStations
    }

    const destinationIndex = allStations.findIndex(
      (s) => s.groupId === wantedDestination.groupId
    )
    const currentStationIndex = allStations.findIndex(
      (s) => s.groupId === station?.groupId
    )

    if (currentStationIndex < destinationIndex) {
      return allStations.slice(0, destinationIndex + 1)
    }
    return allStations.slice(destinationIndex)
  }, [allStations, station?.groupId, wantedDestination])

  const handlePressFAB = useCallback(() => {
    if (!wantedDestination) {
      setStationState((prev) => ({
        ...prev,
        wantedDestination: null,
        stations: prev.allStations,
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

      const wantedDestination = allStations.find((s) => s.id === trainTypeId)
      if (wantedDestination) {
        setStationState((prev) => ({
          ...prev,
          wantedDestination,
        }))
      }
    },
    [allStations, setStationState]
  )

  return (
    <View style={styles.root}>
      <Heading>{translate('selectBoundSettings')}</Heading>
      <Picker
        selectedValue={wantedDestination?.id ?? 0}
        onValueChange={handleDestinationChange}
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
      <FAB onPress={handlePressFAB} icon="md-checkmark" />
    </View>
  )
}

export default SpecifyDestinationSettingsScreen
