import { useNavigation } from '@react-navigation/native'
import React, { useCallback, useEffect, useState } from 'react'
import { BackHandler, StyleSheet, View } from 'react-native'
import { useRecoilValue } from 'recoil'
import useSWR from 'swr'
import {
  GetStationsByLineGroupIdRequest,
  TrainType,
} from '../../gen/proto/stationapi_pb'
import FAB from '../components/FAB'
import Heading from '../components/Heading'
import { TrainTypeInfoModal } from '../components/TrainTypeInfoModal'
import { TrainTypeList } from '../components/TrainTypeList'
import { useStationList } from '../hooks/useStationList'
import { grpcClient } from '../lib/grpc'
import navigationState from '../store/atoms/navigation'
import { translate } from '../translation'

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24, paddingTop: 24 },
})

const TrainTypeSettings: React.FC = () => {
  const [isTrainTypeModalVisible, setIsTrainTypeModalVisible] = useState(false)
  const [selectedTrainType, setSelectedTrainType] = useState<TrainType | null>(
    null
  )

  const {
    data: trainTypeStations,
    isLoading: isStationsLoading,
    error: stationsLoadingError,
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

  const { fetchedTrainTypes } = useRecoilValue(navigationState)

  const navigation = useNavigation()
  const { loading } = useStationList()

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

  const handleTrainTypeConfirmed = () => {}

  return (
    <View style={styles.root}>
      <Heading>{translate('trainTypeSettings')}</Heading>

      <TrainTypeList data={fetchedTrainTypes} onSelect={handleSelect} />

      <FAB disabled={loading} onPress={onPressBack} icon="close" />

      {selectedTrainType ? (
        <TrainTypeInfoModal
          visible={isTrainTypeModalVisible}
          trainType={selectedTrainType}
          stations={trainTypeStations ?? []}
          loading={isStationsLoading}
          error={stationsLoadingError}
          onConfirmed={handleTrainTypeConfirmed}
          onClose={() => setIsTrainTypeModalVisible(false)}
        />
      ) : null}
    </View>
  )
}

export default React.memo(TrainTypeSettings)
