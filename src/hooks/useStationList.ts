import { useQuery } from '@connectrpc/connect-query'
import { useEffect } from 'react'
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import {
  getStationsByLineId,
  getTrainTypesByStationId,
} from '../../gen/proto/stationapi-StationAPI_connectquery'
import {
  TrainDirection,
  TrainType,
  TrainTypeKind,
} from '../../gen/proto/stationapi_pb'
import lineState from '../store/atoms/line'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import {
  findBranchLine,
  findLocalType,
  findRapidType,
} from '../utils/trainTypeString'

export const useStationList = () => {
  const setStationState = useSetRecoilState(stationState)
  const [{ fromBuilder }, setNavigationState] = useRecoilState(navigationState)
  const { selectedLine } = useRecoilValue(lineState)

  const {
    data: byLineIdData,
    isLoading: isLoadingStations,
    error: loadingStationsError,
    refetch: refetchStations,
  } = useQuery(
    getStationsByLineId,
    { lineId: selectedLine?.id, stationId: selectedLine?.station?.id },
    {
      enabled: !!(!fromBuilder && !!selectedLine),
    }
  )

  const {
    data: fetchedTrainTypesData,
    isLoading: isTrainTypesLoading,
    error: trainTypesFetchError,
    refetch: refetchTrainTypes,
  } = useQuery(
    getTrainTypesByStationId,
    {
      stationId: selectedLine?.station?.id,
    },
    { enabled: !!selectedLine?.station?.id }
  )

  useEffect(() => {
    setStationState((prev) => ({
      ...prev,
      stations: prev.stations.length
        ? prev.stations
        : byLineIdData?.stations ?? [],
    }))

    const trainTypes = fetchedTrainTypesData?.trainTypes ?? []

    const localType = findLocalType(trainTypes)
    const branchLineType = findBranchLine(trainTypes)
    const rapidType = findRapidType(trainTypes)

    const orderedType = localType ?? branchLineType ?? rapidType

    if (orderedType) {
      setNavigationState((prev) => ({
        ...prev,
        trainType: orderedType,
      }))
    }
  }, [
    byLineIdData?.stations,
    fetchedTrainTypesData?.trainTypes,
    selectedLine?.id,
    setNavigationState,
    setStationState,
  ])

  useEffect(() => {
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

    const fetchedTrainTypes = fetchedTrainTypesData?.trainTypes ?? []

    // 普通種別が登録済み: 非表示
    // 支線種別が登録されていているが、普通種別が登録されていない: 非表示
    // 特例で普通列車以外の種別で表示を設定されている場合(中央線快速等): 表示
    // 上記以外: 表示
    if (
      !(
        findLocalType(fetchedTrainTypes) ||
        (findBranchLine(fetchedTrainTypes) && !findLocalType(fetchedTrainTypes))
      )
    ) {
      setNavigationState((prev) => ({
        ...prev,
        fetchedTrainTypes: [localType, ...fetchedTrainTypes],
      }))
    }

    setNavigationState((prev) => ({
      ...prev,
      fetchedTrainTypes,
    }))
  }, [fetchedTrainTypesData?.trainTypes, setNavigationState])

  return {
    refetchStations,
    refetchTrainTypes,
    stations: byLineIdData?.stations ?? [],
    trainTypes: fetchedTrainTypesData?.trainTypes ?? [],
    loading: isLoadingStations || isTrainTypesLoading,
    error: loadingStationsError || trainTypesFetchError,
  }
}
