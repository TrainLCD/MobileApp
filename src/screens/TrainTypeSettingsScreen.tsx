import { useNavigation } from '@react-navigation/native'
import React, { useCallback, useEffect, useState } from 'react'
import { BackHandler, StyleSheet, View } from 'react-native'
import { useRecoilState, useSetRecoilState } from 'recoil'
import useSWR from 'swr'
import {
  GetStationsByLineGroupIdRequest,
  TrainType,
} from '../../gen/proto/stationapi_pb'
import FAB from '../components/FAB'
import Heading from '../components/Heading'
import { TrainTypeInfoModal } from '../components/TrainTypeInfoModal'
import { TrainTypeList } from '../components/TrainTypeList'
import { grpcClient } from '../lib/grpc'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import { translate } from '../translation'

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 48, paddingTop: 24 },
})

const TrainTypeSettings: React.FC = () => {
  const [isTrainTypeModalVisible, setIsTrainTypeModalVisible] = useState(false)
  const [selectedTrainType, setSelectedTrainType] = useState<TrainType | null>(
    null
  )

  const [{ fetchedTrainTypes }, setNavigationState] =
    useRecoilState(navigationState)
  const setStationState = useSetRecoilState(stationState)

  const navigation = useNavigation()

  const {
    data: trainTypeStations = [],
    isLoading: isTrainTypeStationsLoading,
    error: trainTypeStationsError,
  } = useSWR(
    ['/app.trainlcd.grpc/GetStationsByLineGroupId', selectedTrainType?.groupId],
    async ([, lineGroupId]) => {
      const req = new GetStationsByLineGroupIdRequest({
        lineGroupId,
      })
      const res = await grpcClient.getStationsByLineGroupId(req)
      return res.stations
    }
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
        stations: trainTypeStations,
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
      trainTypeStations,
    ]
  )

  return (
    <View style={styles.root}>
      <Heading>{translate('trainTypeSettings')}</Heading>

      <TrainTypeList data={fetchedTrainTypes} onSelect={handleSelect} />

      <FAB onPress={onPressBack} icon="close" />

      {selectedTrainType ? (
        <TrainTypeInfoModal
          visible={isTrainTypeModalVisible}
          trainType={selectedTrainType}
          stations={trainTypeStations}
          loading={isTrainTypeStationsLoading}
          error={trainTypeStationsError}
          onConfirmed={handleTrainTypeConfirmed}
          onClose={() => setIsTrainTypeModalVisible(false)}
        />
      ) : null}
    </View>
  )
}

export default React.memo(TrainTypeSettings)
