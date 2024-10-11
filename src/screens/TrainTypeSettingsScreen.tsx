import { useQuery } from '@connectrpc/connect-query'
import { useNavigation } from '@react-navigation/native'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { BackHandler, StyleSheet, View } from 'react-native'
import { useRecoilState } from 'recoil'
import { getStationsByLineGroupId } from '../../gen/proto/stationapi-StationAPI_connectquery'
import { TrainType } from '../../gen/proto/stationapi_pb'
import FAB from '../components/FAB'
import Heading from '../components/Heading'
import { TrainTypeInfoModal } from '../components/TrainTypeInfoModal'
import { TrainTypeList } from '../components/TrainTypeList'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import { translate } from '../translation'

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 48, paddingVertical: 12 },
  listContainer: { flex: 1, width: '65%', alignSelf: 'center' },
})

const TrainTypeSettings: React.FC = () => {
  const [isTrainTypeModalVisible, setIsTrainTypeModalVisible] = useState(false)
  const [selectedTrainType, setSelectedTrainType] = useState<TrainType | null>(
    null
  )

  const [{ fetchedTrainTypes }, setNavigationState] =
    useRecoilState(navigationState)
  const [{ stations: stationsFromState }, setStationState] =
    useRecoilState(stationState)

  const navigation = useNavigation()

  const {
    data: byLineGroupIdData,
    isLoading: isLineGroupByIdLoading,
    error: byLineGroupIdFetchError,
  } = useQuery(
    getStationsByLineGroupId,
    {
      lineGroupId: selectedTrainType?.groupId,
    },
    { enabled: !!selectedTrainType }
  )

  const stations = useMemo(
    () =>
      byLineGroupIdData?.stations?.length
        ? byLineGroupIdData.stations
        : stationsFromState,
    [byLineGroupIdData?.stations, stationsFromState]
  )

  const onPressBack = useCallback(async () => {
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

  const handleSelect = (tt: TrainType) => {
    setSelectedTrainType(tt)
    setIsTrainTypeModalVisible(true)
  }

  const handleTrainTypeConfirmed = useCallback(
    async (trainType: TrainType) => {
      if (trainType.id === 0) {
        setNavigationState((prev) => ({
          ...prev,
          trainType: null,
        }))
        // 種別が変わるとすでに選択していた行先が停車駅に存在しない場合があるのでリセットする
        setStationState((prev) => ({
          ...prev,
          wantedDestination: null,
        }))
        setIsTrainTypeModalVisible(false)

        if (navigation.canGoBack()) {
          navigation.goBack()
        }
        return
      }

      const selectedTrainType = fetchedTrainTypes?.find(
        (tt) => tt.id === trainType.id
      )

      if (!selectedTrainType) {
        return
      }

      setNavigationState((prev) => ({
        ...prev,
        trainType: selectedTrainType,
      }))
      // 種別が変わるとすでに選択していた行先が停車駅に存在しない場合があるのでリセットする
      setStationState((prev) => ({
        ...prev,
        wantedDestination: null,
        stations,
      }))

      setIsTrainTypeModalVisible(false)

      if (navigation.canGoBack()) {
        navigation.goBack()
      }
    },
    [
      fetchedTrainTypes,
      navigation,
      setNavigationState,
      setStationState,
      stations,
    ]
  )

  return (
    <View style={styles.root}>
      <Heading>{translate('trainTypeSettings')}</Heading>

      <View style={styles.listContainer}>
        <TrainTypeList data={fetchedTrainTypes} onSelect={handleSelect} />
      </View>

      <FAB onPress={onPressBack} icon="close" />

      {selectedTrainType ? (
        <TrainTypeInfoModal
          visible={isTrainTypeModalVisible}
          trainType={selectedTrainType}
          stations={stations}
          loading={isLineGroupByIdLoading}
          error={byLineGroupIdFetchError}
          onConfirmed={handleTrainTypeConfirmed}
          onClose={() => setIsTrainTypeModalVisible(false)}
        />
      ) : null}
    </View>
  )
}

export default React.memo(TrainTypeSettings)
