import { useNavigation } from '@react-navigation/native'
import React, { useCallback, useEffect, useMemo } from 'react'
import { ActivityIndicator, BackHandler, StyleSheet, View } from 'react-native'
import RNPickerSelect from 'react-native-picker-select'
import { RFValue } from 'react-native-responsive-fontsize'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRecoilState } from 'recoil'
import FAB from '../components/FAB'
import Heading from '../components/Heading'
import useTrainTypeLabels from '../hooks/useTrainTypeLabels'
import navigationState from '../store/atoms/navigation'
import { translate } from '../translation'

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 24,
    flex: 1,
    paddingTop: 24,
  },
  stopStations: {
    fontSize: RFValue(14),
  },
})

const TrainTypeSettings: React.FC = () => {
  const [{ trainType, fetchedTrainTypes }, setNavigationState] =
    useRecoilState(navigationState)

  const navigation = useNavigation()

  const trainTypeLabels = useTrainTypeLabels(fetchedTrainTypes)

  const items = useMemo(
    () =>
      fetchedTrainTypes.map((tt, idx) => ({
        label: trainTypeLabels[idx] ?? '',
        value: tt.id,
      })) ?? [],
    [fetchedTrainTypes, trainTypeLabels]
  )

  const onPressBack = useCallback(() => {
    // 普通/各駅停車が選ばれた状態で戻ろうとした場合は種別設定をステートから消す
    if (!trainType) {
      setNavigationState((prev) => ({
        ...prev,
        fetchedTrainTypes: [],
      }))
    }

    if (navigation.canGoBack()) {
      navigation.goBack()
    }
  }, [navigation, setNavigationState, trainType])

  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      onPressBack()
      return true
    })
    return (): void => {
      handler.remove()
    }
  }, [onPressBack])

  const handleTrainTypeChange = useCallback(
    (trainTypeId: number) => {
      if (trainTypeId === 0) {
        setNavigationState((prev) => ({
          ...prev,
          trainType: null,
        }))
        return
      }

      const selectedTrainType = fetchedTrainTypes?.find(
        (tt) => tt.id === trainTypeId
      )
      if (!selectedTrainType) {
        return
      }

      setNavigationState((prev) => ({
        ...prev,
        trainType: selectedTrainType,
      }))
    },
    [fetchedTrainTypes, setNavigationState]
  )

  if (!items.length) {
    return (
      <View style={styles.root}>
        <Heading>{translate('trainTypeSettings')}</Heading>
        <ActivityIndicator
          color="#555"
          size="large"
          style={{ marginTop: 24 }}
        />
        <FAB onPress={onPressBack} icon="md-checkmark" />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.root}>
      <Heading>{translate('trainTypeSettings')}</Heading>
      <RNPickerSelect
        placeholder={{}}
        value={trainType?.id ?? 0}
        items={items}
        onValueChange={handleTrainTypeChange}
        style={{
          inputIOS: { fontSize: RFValue(14), marginVertical: 16 },
          inputAndroid: { fontSize: RFValue(14), marginVertical: 16 },
        }}
      />
      <FAB onPress={onPressBack} icon="md-checkmark" />
    </SafeAreaView>
  )
}

export default TrainTypeSettings
