import { Picker } from '@react-native-picker/picker'
import { useNavigation } from '@react-navigation/native'
import React, { useCallback, useEffect, useMemo } from 'react'
import { ActivityIndicator, BackHandler, StyleSheet, View } from 'react-native'
import { useRecoilState, useRecoilValue } from 'recoil'
import FAB from '../components/FAB'
import Heading from '../components/Heading'
import {
  GetTrainTypesByStationIdRequest,
  TrainDirection,
  TrainType,
} from '../gen/stationapi_pb'
import useCurrentLine from '../hooks/useCurrentLine'
import useCurrentStation from '../hooks/useCurrentStation'
import useGRPC from '../hooks/useGRPC'
import lineState from '../store/atoms/line'
import navigationState from '../store/atoms/navigation'
import { isJapanese, translate } from '../translation'
import { findLocalType, getIsChuoLineRapid } from '../utils/localType'

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 24,
    flex: 1,
    paddingTop: 24,
  },
})

const TrainTypeSettings: React.FC = () => {
  const { selectedLine } = useRecoilValue(lineState)
  const [{ trainType, fetchedTrainTypes }, setNavigationState] =
    useRecoilState(navigationState)
  const navigation = useNavigation()

  const grpcClient = useGRPC()
  const currentStation = useCurrentStation({ withTrainTypes: true })
  const currentLine = useCurrentLine()

  const fetchTrainTypesAsync = useCallback(async () => {
    if (!currentStation) {
      return
    }
    const req = new GetTrainTypesByStationIdRequest()
    req.setStationId(currentStation.id)
    return (await grpcClient?.getTrainTypesByStationId(req, null))?.toObject()
  }, [currentStation, grpcClient])

  const getJapaneseItemLabel = useCallback(
    (tt: TrainType.AsObject) => {
      const solo = tt.linesList.length === 1
      if (solo) {
        return tt.name
      }
      const currentLineIndex = tt.linesList.findIndex(
        (l) => l.id === currentLine?.id
      )
      const prevType = fetchedTrainTypes[currentLineIndex - 1]
      const nextType = fetchedTrainTypes[currentLineIndex + 1]
      const prevLine = tt.linesList[currentLineIndex - 1]
      const nextLine = tt.linesList[currentLineIndex + 1]
      const prevText = prevType
        ? `${prevLine.nameShort}内 ${prevType.name}`
        : ''
      const nextText = nextType
        ? `${nextLine.nameShort}内 ${nextType.name}`
        : ''

      return `${currentLine?.nameShort}内 ${tt.name}\n${prevText} ${nextText}`
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
    if (navigation.canGoBack()) {
      navigation.goBack()
    }
  }, [navigation])

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
        setNavigationState((prev) => ({
          ...prev,
          stations: [],
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

  useEffect(() => {
    const updateTrainTypeStateAsync = async () => {
      const data = await fetchTrainTypesAsync()

      const localType = findLocalType(data?.trainTypesList ?? [])

      setNavigationState((prev) => ({ ...prev, fetchedTrainTypes: [] }))

      // 中央線快速に各停の種別が表示されないようにしたい
      if (getIsChuoLineRapid(selectedLine)) {
        setNavigationState((prev) => ({
          ...prev,
          fetchedTrainTypes: data?.trainTypesList ?? [],
        }))
        return
      }

      if (!localType) {
        setNavigationState((prev) => ({
          ...prev,
          fetchedTrainTypes: [
            {
              id: 0,
              typeId: 0,
              groupId: 0,
              name: '普通/各駅停車',
              nameKatakana: '',
              nameRoman: 'Local',
              nameChinese: '慢车/每站停车',
              nameKorean: '보통/각역정차',
              color: '',
              linesList: [],
              direction: TrainDirection.BOTH,
            },
            ...(data?.trainTypesList || []),
          ],
        }))

        return
      }
      setNavigationState((prev) => ({
        ...prev,
        fetchedTrainTypes: data?.trainTypesList ?? [],
      }))
    }
    updateTrainTypeStateAsync()
  }, [fetchTrainTypesAsync, selectedLine, setNavigationState])

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
        numberOfLines={2}
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
