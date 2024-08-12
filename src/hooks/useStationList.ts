import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import useSWR from 'swr'
import {
  GetStationByLineIdRequest,
  GetTrainTypesByStationIdRequest,
  TrainDirection,
  TrainType,
  TrainTypeKind,
} from '../../gen/proto/stationapi_pb'
import { grpcClient } from '../lib/grpc'
import lineState from '../store/atoms/line'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import { findBranchLine, findLocalType } from '../utils/trainTypeString'

export const useStationList = () => {
  const setStationState = useSetRecoilState(stationState)
  const [{ fromBuilder }, setNavigationState] = useRecoilState(navigationState)
  const { selectedLine } = useRecoilValue(lineState)

  const {
    isLoading: isLoadingStations,
    error: loadingStationsError,
    mutate: mutateStations,
  } = useSWR(
    [
      '/app.trainlcd.grpc/getStationsByLineId',
      selectedLine?.station?.id,
      selectedLine?.id,
    ],
    async ([, stationId, lineId]) => {
      if (fromBuilder || !stationId || !lineId) {
        return
      }

      const req = new GetStationByLineIdRequest({ lineId, stationId })
      const res = await grpcClient.getStationsByLineId(req)

      setStationState((prev) => ({
        ...prev,
        stations: res.stations,
      }))

      return res.stations
    }
  )

  const { isLoading: isTrainTypesLoading, error: loadingTrainTypesError } =
    useSWR(
      [
        '/app.trainlcd.grpc/GetTrainTypesByStationId',
        selectedLine?.station?.id,
        selectedLine?.station?.hasTrainTypes,
      ],
      async ([, stationId, shouldFetch]) => {
        if (!stationId || !shouldFetch) {
          return
        }

        const req = new GetTrainTypesByStationIdRequest({ stationId })
        const res = await grpcClient.getTrainTypesByStationId(req, {})

        const trainTypes = res.trainTypes ?? []
        const localType = new TrainType({
          id: 0,
          typeId: 0,
          groupId: 0,
          name: '普通/各駅停車',
          nameKatakana: '',
          nameRoman: 'Local',
          nameChinese: '慢车/每站停车',
          nameKorean: '보통/각역정차',
          color: '',
          lines: [],
          direction: TrainDirection.Both,
          kind: TrainTypeKind.Default,
        })

        // 普通種別が登録済み: 非表示
        // 支線種別が登録されていているが、普通種別が登録されていない: 非表示
        // 特例で普通列車以外の種別で表示を設定されている場合(中央線快速等): 表示
        // 上記以外: 表示
        if (
          !(
            findLocalType(trainTypes) ||
            (findBranchLine(trainTypes) && !findLocalType(trainTypes))
          )
        ) {
          setNavigationState((prev) => ({
            ...prev,
            fetchedTrainTypes: [localType, ...trainTypes],
          }))
          return trainTypes
        }

        setNavigationState((prev) => ({
          ...prev,
          fetchedTrainTypes: trainTypes,
        }))
      }
    )

  return {
    mutateStations,
    loading: isLoadingStations || isTrainTypesLoading,
    error: loadingStationsError || loadingTrainTypesError,
  }
}
