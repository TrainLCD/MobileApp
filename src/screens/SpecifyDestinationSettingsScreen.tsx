import { Picker } from '@react-native-picker/picker'
import { useNavigation } from '@react-navigation/native'
import React, { useCallback, useEffect, useMemo } from 'react'
import { BackHandler, StyleSheet, View } from 'react-native'
import { useRecoilState } from 'recoil'
import FAB from '../components/FAB'
import Heading from '../components/Heading'
import { LED_THEME_BG_COLOR } from '../constants/color'
import { StopCondition } from '../gen/stationapi_pb'
import { useIsLEDTheme } from '../hooks/useIsLEDTheme'
import stationState from '../store/atoms/station'
import { translate } from '../translation'
import dropEitherJunctionStation from '../utils/dropJunctionStation'

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 24,
    flex: 1,
    paddingTop: 24,
  },
})

const SpecifyDestinationSettingsScreen: React.FC = () => {
  const [{ wantedDestination, station, allStations }, setStationState] =
    useRecoilState(stationState)

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
          label: s.name,
          value: s.id,
        })),
    ],
    [station?.groupId, stopStations]
  )

  const handlePressFAB = useCallback(() => {
    // 指定なしが選ばれた状態で戻ろうとした場合は行先設定をステートから消す
    if (!wantedDestination) {
      setStationState((prev) => ({
        ...prev,
        wantedDestination: null,
      }))
      if (navigation.canGoBack()) {
        navigation.goBack()
      }
      return
    }

    setStationState((prev) => ({
      ...prev,
      wantedDestination,
    }))

    if (navigation.canGoBack()) {
      navigation.goBack()
    }
  }, [navigation, setStationState, wantedDestination])

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
      const wantedDestination = stopStations.find((s) => s.id === trainTypeId)
      if (wantedDestination) {
        setStationState((prev) => ({ ...prev, wantedDestination }))
      }
    },
    [setStationState, stopStations]
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
