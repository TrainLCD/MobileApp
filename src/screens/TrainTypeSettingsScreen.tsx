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
import useNextTrainType from '../hooks/useNextTrainType'
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
  const nextTrainType = useNextTrainType()

  const getJapaneseItemLabel = useCallback(
    (tt: TrainType.AsObject) => {
      const solo = tt.linesList.length === 1
      if (solo || !tt.id) {
        return tt.name
      }

      // TODO: すべて路線の種別が同じ場合の表示
      const allTrainTypeIds = tt.linesList.map((l) => l.trainType?.typeId)
      const isAllSameTrainType = allTrainTypeIds.every((v, i, a) => v === a[0])

      if (isAllSameTrainType) {
        const otherLinesText = tt.linesList
          .filter((l) => l.id !== currentLine?.id)
          .map((l) => l.nameShort.replace(parenthesisRegexp, ''))
          .join('・')
        return `${currentLine?.nameShort.replace(parenthesisRegexp, '')} ${
          tt.name
        }\n${otherLinesText}直通`
      }

      const otherLinesText = tt.linesList
        .filter((l) => l.id !== currentLine?.id)
        .map(
          (l) =>
            `${l.nameShort.replace(
              parenthesisRegexp,
              ''
            )} ${l.trainType?.name.replace(parenthesisRegexp, '')}`
        )
        .join('・')
      return `${currentLine?.nameShort.replace(parenthesisRegexp, '')} ${
        tt.name
      }\n${otherLinesText}`
    },
    [currentLine?.id, currentLine?.nameShort]
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
      const prevLine = tt.linesList[currentLineIndex - 1]
      const nextLine = tt.linesList[currentLineIndex + 1]
      const prevText = prevType
        ? `${prevLine.nameRoman} ${prevType.nameRoman}`
        : ''
      const nextText = nextTrainType
        ? `${nextLine.nameRoman} ${nextTrainType.nameRoman}`
        : ''

      return `${currentLine?.nameRoman} ${tt.nameRoman}\n${prevText} ${nextText}`
    },
    [currentLine?.id, currentLine?.nameRoman, fetchedTrainTypes, nextTrainType]
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
