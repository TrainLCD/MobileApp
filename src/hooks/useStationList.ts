import { useQuery } from '@connectrpc/connect-query'
import { useEffect, useMemo } from 'react'
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

  const designatedTrainType = useMemo(
    () =>
      byLineIdData?.stations.find((s) => s.id === selectedLine?.station?.id)
        ?.trainType ?? null,
    [byLineIdData?.stations, selectedLine?.station?.id]
  )

  useEffect(() => {
    setStationState((prev) => ({
      ...prev,
      stations: prev.stations.length
        ? prev.stations
        : byLineIdData?.stations ?? [],
    }))
    setNavigationState((prev) => ({
      ...prev,
      trainType: designatedTrainType,
    }))
  }, [
    byLineIdData?.stations,
    designatedTrainType,
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

    if (!designatedTrainType) {
      setNavigationState((prev) => ({
        ...prev,
        fetchedTrainTypes: [localType, ...fetchedTrainTypes],
      }))
      return
    }

    setNavigationState((prev) => ({
      ...prev,
      fetchedTrainTypes,
    }))
  }, [
    designatedTrainType,
    fetchedTrainTypesData?.trainTypes,
    setNavigationState,
  ])

  return {
    refetchStations,
    refetchTrainTypes,
    stations: byLineIdData?.stations ?? [],
    trainTypes: fetchedTrainTypesData?.trainTypes ?? [],
    loading: isLoadingStations || isTrainTypesLoading,
    error: loadingStationsError || trainTypesFetchError,
  }
}
