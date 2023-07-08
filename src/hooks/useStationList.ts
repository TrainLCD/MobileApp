import { useCallback, useEffect, useState } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'
import {
  GetStationByLineIdRequest,
  GetStationsByLineGroupIdRequest,
  GetTrainTypesByStationIdRequest,
  Station,
} from '../gen/stationapi_pb'
import lineState from '../store/atoms/line'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import useGRPC from './useGRPC'

const useStationList = (): {
  loading: boolean
  error: Error | null
} => {
  const [{ station, stations }, setStationState] = useRecoilState(stationState)
  const [{ trainType, fetchedTrainTypes }, setNavigationState] =
    useRecoilState(navigationState)
  const { selectedLine } = useRecoilValue(lineState)
  const grpcClient = useGRPC()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchInitialStationList = useCallback(async () => {
    const lineId = station?.line?.id
    if (!lineId) {
      return
    }
    try {
      const req = new GetStationByLineIdRequest()
      req.setLineId(lineId)
      const data = (
        await grpcClient?.getStationsByLineId(req, null)
      )?.toObject()

      if (data) {
        setStationState((prev) => ({
          ...prev,
          stations: data.stationsList
            .filter((s) => !!s)
            .map((s) => s as Station.AsObject),
          // 再帰的にTrainTypesは取れないのでバックアップしておく
          stationsWithTrainTypes: data.stationsList
            .filter((s) => !!s)
            .map((s) => s as Station.AsObject),
        }))
      }
      if (!station?.hasTrainTypes) {
        setLoading(false)
      }
    } catch (err) {
      setError(err as any)
      setLoading(false)
    }
  }, [grpcClient, setStationState, station?.hasTrainTypes, station?.line?.id])
  const fetchTrainTypes = useCallback(async () => {
    if (!station) {
      return
    }
    try {
      const req = new GetTrainTypesByStationIdRequest()
      const stationId = !stations.length
        ? station.id
        : stations.find((s) => s.line?.id === selectedLine?.id)?.id ??
          station.id
      req.setStationId(stationId)
      const trainTypesRes = (
        await grpcClient?.getTrainTypesByStationId(req, null)
      )?.toObject()

      if (!trainTypesRes) {
        return
      }
      setNavigationState((prev) => ({
        ...prev,
        fetchedTrainTypes: trainTypesRes.trainTypesList,
      }))

      setLoading(false)
    } catch (err) {
      setError(err as any)
      setLoading(false)
    }
  }, [grpcClient, selectedLine?.id, setNavigationState, station, stations])
  const fetchSelectedTrainTypeStations = useCallback(async () => {
    setLoading(true)
    if (!trainType) {
      return
    }
    try {
      const req = new GetStationsByLineGroupIdRequest()
      req.setLineGroupId(trainType.groupId)
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
  }, [grpcClient, setStationState, trainType])

  useEffect(() => {
    if (!stations.length && !fetchedTrainTypes.length) {
      fetchInitialStationList()
    }
  }, [fetchInitialStationList, fetchedTrainTypes.length, stations.length])

  useEffect(() => {
    if (stations.length > 0 && !fetchedTrainTypes.length) {
      fetchTrainTypes()
    }
  }, [fetchTrainTypes, fetchedTrainTypes.length, stations.length])

  useEffect(() => {
    if (fetchedTrainTypes.length > 0) {
      fetchSelectedTrainTypeStations()
    }
  }, [fetchSelectedTrainTypeStations, fetchedTrainTypes.length])

  return { loading, error }
}

export default useStationList
