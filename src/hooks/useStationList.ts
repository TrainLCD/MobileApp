import { useCallback, useEffect, useState } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'

import {
  GetStationByLineIdRequest,
  GetStationsByLineGroupIdRequest,
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

const useStation = (
  fetchAutomatically = true
): {
  fetchInitialStation: () => Promise<void>
  fetchSelectedTrainTypeStations: () => Promise<void>
  loading: boolean
  error: Error | null
} => {
  const [{ stations }, setStationState] = useRecoilState(stationState)
  const [{ trainType, fetchedTrainTypes, fromBuilder }, setNavigationState] =
    useRecoilState(navigationState)
  const { selectedLine } = useRecoilValue(lineState)
  const [loading, setLoading] = useState(!fromBuilder)
  const [error, setError] = useState(null)
  const [loadedTrainTypeId, setLoadedTrainTypeId] = useState<
    number | undefined
  >(trainType?.groupId)

  const fetchTrainTypes = useCallback(async () => {
    try {
      if (fromBuilder) {
        return
      }

      const req = new GetTrainTypesByStationIdRequest()
      if (selectedLine?.station?.id) {
        req.stationId = selectedLine?.station.id
      }
      const trainTypesRes = await grpcClient.getTrainTypesByStationId(req, {})

      if (!trainTypesRes) {
        return
      }

      const trainTypes = trainTypesRes?.trainTypes ?? []

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
              lines: [],
              direction: TrainDirection.Both,
              kind: TrainTypeKind.Default,
            },
          ].map((tt) => new TrainType(tt)),
        }))
      }

      setNavigationState((prev) => ({
        ...prev,
        fetchedTrainTypes: [
          ...prev.fetchedTrainTypes,
          ...trainTypesRes.trainTypes,
        ],
      }))

      setLoading(false)
    } catch (err) {
      setError(err as any)
      setLoading(false)
    }
  }, [fromBuilder, selectedLine?.station?.id, setNavigationState])

  const fetchInitialStation = useCallback(async () => {
    if (fromBuilder) {
      return
    }

    const lineId = selectedLine?.id
    if (!lineId || !selectedLine?.station) {
      return
    }

    setLoading(true)
    try {
      const req = new GetStationByLineIdRequest()
      req.lineId = lineId
      req.stationId = selectedLine.station?.id
      const data = await grpcClient.getStationsByLineId(req)

      if (!data) {
        return
      }
      setStationState((prev) => ({
        ...prev,
        stations: data.stations,
        allStations: data.stations,
      }))

      if (selectedLine?.station?.hasTrainTypes) {
        await fetchTrainTypes()
      }
      setLoading(false)
    } catch (err) {
      setError(err as any)
      setLoading(false)
    }
  }, [
    fetchTrainTypes,
    fromBuilder,
    selectedLine?.id,
    selectedLine?.station,
    setStationState,
  ])

  const fetchSelectedTrainTypeStations = useCallback(async () => {
    if (
      !trainType?.groupId ||
      !fetchedTrainTypes.length ||
      loadedTrainTypeId === trainType.groupId ||
      fromBuilder
    ) {
      return
    }
    setLoading(true)

    try {
      const req = new GetStationsByLineGroupIdRequest()
      req.lineGroupId = trainType?.groupId
      const data = await grpcClient.getStationsByLineGroupId(req)

      if (!data) {
        return
      }
      setStationState((prev) => ({
        ...prev,
        stations: data.stations,
        allStations: data.stations,
      }))

      setLoading(false)
      setLoadedTrainTypeId((prev) =>
        prev !== trainType.groupId ? trainType.groupId : prev
      )
    } catch (err) {
      setError(err as any)
      setLoading(false)
    }
  }, [
    fetchedTrainTypes.length,
    fromBuilder,
    loadedTrainTypeId,
    setStationState,
    trainType?.groupId,
  ])

  useEffect(() => {
    if (!stations.length && fetchAutomatically) {
      fetchInitialStation()
    }
  }, [fetchAutomatically, fetchInitialStation, stations.length])

  return {
    fetchInitialStation,
    fetchSelectedTrainTypeStations,
    loading,
    error,
  }
}

export default useStation
