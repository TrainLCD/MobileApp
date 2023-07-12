import { useCallback, useEffect, useState } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'
import {
  GetStationByLineIdRequest,
  GetStationsByLineGroupIdRequest,
  GetTrainTypesByStationIdRequest,
  Station,
  TrainDirection,
} from '../gen/stationapi_pb'
import lineState from '../store/atoms/line'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import {
  findBranchLine,
  findLocalType,
  getTrainTypeString,
} from '../utils/trainTypeString'
import useGRPC from './useGRPC'

const useStationList = (
  fetchAutomatically = true
): {
  // 多分hooksの外で呼び出す必要がないのでコメントアウト
  // fetchInitialStationList: () => Promise<void>
  fetchSelectedTrainTypeStations: () => Promise<void>
  loading: boolean
  error: Error | null
} => {
  const [{ station }, setStationState] = useRecoilState(stationState)
  const [{ trainType, fetchedTrainTypes }, setNavigationState] =
    useRecoilState(navigationState)
  const { selectedLine } = useRecoilValue(lineState)
  const grpcClient = useGRPC()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTrainTypes = useCallback(async () => {
    if (!station?.id) {
      return
    }
    try {
      const req = new GetTrainTypesByStationIdRequest()
      req.setStationId(station?.id)
      const trainTypesRes = (
        await grpcClient?.getTrainTypesByStationId(req, null)
      )?.toObject()

      if (!trainTypesRes) {
        return
      }

      // 普通種別が登録済み: 非表示
      // 支線種別が登録されていているが、普通種別が登録されていない: 非表示
      // 特例で普通列車以外の種別で表示を設定されている場合(中央線快速等): 表示
      // 上記以外: 表示
      if (
        !(
          findLocalType(trainTypesRes.trainTypesList) ||
          (findBranchLine(trainTypesRes.trainTypesList) &&
            !findLocalType(trainTypesRes.trainTypesList)) ||
          getTrainTypeString(selectedLine, station) !== 'local'
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
              linesList: [],
              direction: TrainDirection.BOTH,
            },
          ],
        }))
      }
      setNavigationState((prev) => ({
        ...prev,
        fetchedTrainTypes: [
          ...prev.fetchedTrainTypes,
          ...trainTypesRes.trainTypesList,
        ],
      }))

      setLoading(false)
    } catch (err) {
      setError(err as any)
      setLoading(false)
    }
  }, [grpcClient, selectedLine, setNavigationState, station])

  const fetchInitialStationList = useCallback(async () => {
    const lineId = selectedLine?.id
    if (!lineId) {
      return
    }

    setLoading(true)
    try {
      const req = new GetStationByLineIdRequest()
      req.setLineId(lineId)
      const data = (
        await grpcClient?.getStationsByLineId(req, null)
      )?.toObject()

      setStationState((prev) => ({
        ...prev,
        stations:
          data?.stationsList ??
          [].filter((s) => !!s).map((s) => s as Station.AsObject),
        // 再帰的にTrainTypesは取れないのでバックアップしておく
        stationsWithTrainTypes:
          data?.stationsList ??
          [].filter((s) => !!s).map((s) => s as Station.AsObject),
      }))

      if (station?.hasTrainTypes) {
        await fetchTrainTypes()
      }
      setLoading(false)
    } catch (err) {
      setError(err as any)
      setLoading(false)
    }
  }, [
    fetchTrainTypes,
    grpcClient,
    selectedLine?.id,
    setStationState,
    station?.hasTrainTypes,
  ])

  const fetchSelectedTrainTypeStations = useCallback(async () => {
    if (!trainType?.groupId || !fetchedTrainTypes.length) {
      return
    }
    setLoading(true)

    try {
      const req = new GetStationsByLineGroupIdRequest()
      req.setLineGroupId(trainType?.groupId)
      const stationsRes = (
        await grpcClient?.getStationsByLineGroupId(req, null)
      )?.toObject()

      if (!stationsRes) {
        return
      }
      setStationState((prev) => ({
        ...prev,
        stations: stationsRes.stationsList,
      }))

      setLoading(false)
    } catch (err) {
      setError(err as any)
      setLoading(false)
    }
  }, [
    fetchedTrainTypes.length,
    grpcClient,
    setStationState,
    trainType?.groupId,
  ])

  useEffect(() => {
    if (!fetchedTrainTypes.length && fetchAutomatically) {
      fetchInitialStationList()
    }
  }, [fetchAutomatically, fetchInitialStationList, fetchedTrainTypes.length])

  return {
    // 多分hooksの外で呼び出す必要がないのでコメントアウト
    // fetchInitialStationList,
    fetchSelectedTrainTypeStations,
    loading,
    error,
  }
}

export default useStationList
