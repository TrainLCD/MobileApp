import { Picker } from '@react-native-picker/picker'
import { useNavigation } from '@react-navigation/native'
import React, { useCallback, useEffect, useMemo } from 'react'
import { ActivityIndicator, BackHandler, StyleSheet, View } from 'react-native'
import { useRecoilState } from 'recoil'
import FAB from '../components/FAB'
import Heading from '../components/Heading'
import { parenthesisRegexp } from '../constants/regexp'
import { TrainType } from '../gen/stationapi_pb'
import useCurrentLine from '../hooks/useCurrentLine'
import useStationList from '../hooks/useStationList'
import navigationState from '../store/atoms/navigation'
import { isJapanese, translate } from '../translation'

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 24,
    flex: 1,
    paddingTop: 24,
  },
})

const TrainTypeSettings: React.FC = () => {
  const [{ trainType, fetchedTrainTypes }, setNavigationState] =
    useRecoilState(navigationState)

  const navigation = useNavigation()
  const { fetchSelectedTrainTypeStations } = useStationList(false)
  const currentLine = useCurrentLine()

  const getJapaneseItemLabel = useCallback(
    (tt: TrainType.AsObject) => {
      const solo = tt.linesList.length === 1
      if (solo || !tt.id) {
        return tt.name
      }
      const currentLineIndex = tt.linesList.findIndex(
        (l) => l.id === currentLine?.id
      )
      const prevType = fetchedTrainTypes[currentLineIndex - 1]
      const nextType = fetchedTrainTypes[currentLineIndex + 1]
      const prevLine = tt.linesList[currentLineIndex - 1]
      const nextLine = tt.linesList[currentLineIndex + 1]
      const prevText =
        prevLine && prevType ? `${prevLine.nameShort} ${prevType.name}` : ''
      const nextText =
        nextLine && nextType ? `${nextLine.nameShort} ${nextType.name}` : ''

      return `${currentLine?.nameShort.replace(parenthesisRegexp, '')} ${
        tt.name
      }\n${prevText} ${nextText}`
    },
    [currentLine?.id, currentLine?.nameShort, fetchedTrainTypes]
  )
  const getEnglishItemLabel = useCallback(
    (tt: TrainType.AsObject) => {
      const solo = tt.linesList.length === 1
      if (solo) {
        return tt.nameRoman
      }
      const currentLineIndex = tt.linesList.findIndex(
        (l) => l.id === currentLine?.id
      )
      const prevType = fetchedTrainTypes[currentLineIndex - 1]
      const nextType = fetchedTrainTypes[currentLineIndex + 1]
      const prevLine = tt.linesList[currentLineIndex - 1]
      const nextLine = tt.linesList[currentLineIndex + 1]
      const prevText = prevType
        ? `${prevLine.nameRoman} ${prevType.nameRoman}`
        : ''
      const nextText = nextType
        ? `${nextLine.nameRoman} ${nextType.nameRoman}`
        : ''

      return `${currentLine?.nameRoman} ${tt.nameRoman}\n${prevText} ${nextText}`
    },
    [currentLine?.id, currentLine?.nameRoman, fetchedTrainTypes]
  )

  const items = useMemo(
    () =>
      fetchedTrainTypes.map((tt) => ({
        label: isJapanese ? getJapaneseItemLabel(tt) : getEnglishItemLabel(tt),
        value: tt.id,
      })) ?? [],
    [fetchedTrainTypes, getEnglishItemLabel, getJapaneseItemLabel]
  )

  const onPressBack = useCallback(() => {
    // 普通/各駅停車が選ばれた状態で戻ろうとした場合は種別設定をステートから消す
    if (!trainType) {
      setNavigationState((prev) => ({
        ...prev,
        fetchedTrainTypes: [],
      }))
    }

    fetchSelectedTrainTypeStations()

    if (navigation.canGoBack()) {
      navigation.goBack()
    }
  }, [
    fetchSelectedTrainTypeStations,
    navigation,
    setNavigationState,
    trainType,
  ])

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
    <View style={styles.root}>
      <Heading>{translate('trainTypeSettings')}</Heading>
      <Picker
        selectedValue={trainType?.id}
        onValueChange={handleTrainTypeChange}
        numberOfLines={2} // TODO: すべての種別で直通先がない場合は1行にする
      >
        {items.map((it) => (
          <Picker.Item key={it.value} label={it.label} value={it.value} />
        ))}
      </Picker>
      <FAB onPress={onPressBack} icon="md-checkmark" />
    </View>
  )
}

export default TrainTypeSettings
