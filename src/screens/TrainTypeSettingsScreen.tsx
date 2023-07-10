import { Picker } from '@react-native-picker/picker'
import { useNavigation } from '@react-navigation/native'
import React, { useCallback, useEffect, useMemo } from 'react'
import { ActivityIndicator, BackHandler, StyleSheet, View } from 'react-native'
import { useRecoilState } from 'recoil'
import FAB from '../components/FAB'
import Heading from '../components/Heading'
import { parenthesisRegexp } from '../constants/regexp'
import { Line, TrainType } from '../gen/stationapi_pb'
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

  const getItemLabel = useCallback(
    (tt: TrainType.AsObject) => {
      const solo = tt.linesList.length === 1
      if (solo || !tt.id) {
        return isJapanese ? tt.name : tt.nameRoman
      }

      const allTrainTypeIds = tt.linesList.map((l) => l.trainType?.typeId)
      const allCompanyIds = tt.linesList.map((l) => l.company?.id)
      const isAllSameTrainType = allTrainTypeIds.every((v, i, a) => v === a[0])
      const isAllSameOperator = allCompanyIds.every((v, i, a) => v === a[0])

      const duplicatedCompanyIds = tt.linesList
        .map((l) => l.company?.id)
        .filter((id, idx, self) => self.indexOf(id) !== idx)
      const duplicatedTypeIds = tt.linesList
        .map((l) => l.trainType?.typeId)
        .filter((id, idx, self) => self.indexOf(id) !== idx)

      const reducedBySameOperatorLines = tt.linesList.reduce<Line.AsObject[]>(
        (lines, line) => {
          const isCurrentOperatedSameCompany = duplicatedCompanyIds.every(
            (id) => id === line.company?.id
          )
          const hasSameTypeLine = duplicatedTypeIds.every(
            (id) => id === line.trainType?.typeId
          )

          const hasSameCompanySameTypeLine =
            isCurrentOperatedSameCompany && hasSameTypeLine

          const hasPushedMatchedStation = lines.some(
            (l) =>
              duplicatedCompanyIds.includes(l.company?.id) &&
              duplicatedTypeIds.includes(l.trainType?.typeId)
          )

          if (hasPushedMatchedStation) {
            return lines
          }

          if (hasSameCompanySameTypeLine) {
            line.company &&
              lines.push({
                ...line,
                nameShort: `${line.company?.nameShort}線`,
                nameRoman: `${line.company?.nameEnglishShort} Line`,
              })
            return lines
          }

          lines.push(line)
          return lines
        },
        []
      )

      if (isAllSameTrainType && !isAllSameOperator) {
        if (isJapanese) {
          const otherLinesText = reducedBySameOperatorLines
            .filter((line, idx, self) =>
              self.length === 1 ? true : line.id !== currentLine?.id
            )
            .map((l) => l.nameShort.replace(parenthesisRegexp, ''))
            .join('・')
          return `${currentLine?.nameShort.replace(parenthesisRegexp, '')} ${
            tt.name
          }\n${otherLinesText}直通`
        } else {
          const otherLinesText = reducedBySameOperatorLines
            .filter((line, idx, self) =>
              self.length === 1 ? true : line.id !== currentLine?.id
            )
            .map((l) => l.nameRoman.replace(parenthesisRegexp, ''))
            .join('/')
          return `${currentLine?.nameRoman.replace(parenthesisRegexp, '')} ${
            tt.nameRoman
          }\n${otherLinesText}`
        }
      }

      if (isAllSameTrainType && isAllSameOperator) {
        if (isJapanese) {
          const otherLinesText = tt.linesList
            .filter((l) => l.id !== currentLine?.id)
            .map((l) => l.nameShort.replace(parenthesisRegexp, ''))
            .join('・')
          return `${currentLine?.nameShort.replace(parenthesisRegexp, '')} ${
            tt.name
          }\n${otherLinesText}直通`
        } else {
          const otherLinesText = tt.linesList
            .filter((l) => l.id !== currentLine?.id)
            .map((l) => l.nameRoman.replace(parenthesisRegexp, ''))
            .join('/')
          return `${currentLine?.nameRoman.replace(parenthesisRegexp, '')} ${
            tt.nameRoman
          }\nVia ${otherLinesText}`
        }
      }

      if (isJapanese) {
        const otherLinesText = reducedBySameOperatorLines
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
      } else {
        const otherLinesText = reducedBySameOperatorLines
          .filter((l) => l.id !== currentLine?.id)
          .map(
            (l) =>
              `${l.nameRoman.replace(
                parenthesisRegexp,
                ''
              )} ${l.trainType?.nameRoman.replace(parenthesisRegexp, '')}`
          )
          .join('/')
        return `${currentLine?.nameRoman.replace(parenthesisRegexp, '')} ${
          tt.nameRoman
        }\n${otherLinesText}`
      }
    },
    [currentLine?.id, currentLine?.nameRoman, currentLine?.nameShort]
  )

  const items = useMemo(
    () =>
      fetchedTrainTypes.map((tt) => ({
        label: getItemLabel(tt),
        value: tt.id,
      })) ?? [],
    [fetchedTrainTypes, getItemLabel]
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

  const numberOfLines = useMemo(
    () =>
      items
        .map((item) => item.label.split('\n').length)
        .reduce((a, b) => Math.max(a, b), 0),
    [items]
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
        numberOfLines={numberOfLines}
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
