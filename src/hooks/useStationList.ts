import { useCallback, useState } from 'react'
import { useSetRecoilState } from 'recoil'
import { GetStationByLineIdRequest } from '../gen/stationapi_pb'
import stationState from '../store/atoms/station'
import useConnectivity from './useConnectivity'
import useGRPC from './useGRPC'

const useStationList = (): [(lineId: number) => void, boolean, any] => {
  const setStation = useSetRecoilState(stationState)
  const grpcClient = useGRPC()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const isInternetAvailable = useConnectivity()

  const fetchStationListWithTrainTypes = useCallback(
    async (lineId: number) => {
      if (!isInternetAvailable) {
        return
      }
      try {
        const req = new GetStationByLineIdRequest()
        req.setLineId(lineId)
        const data = (
          await grpcClient?.getStationsByLineId(req, null)
        )?.toObject()

        if (data) {
          data
          setStation((prev) => ({
            ...prev,
            stations: data.stationsList,
            // 再帰的にTrainTypesは取れないのでバックアップしておく
            stationsWithTrainTypes: data.stationsList,
          }))
        }
        setLoading(false)
      } catch (err) {
        setError(err as any)
        setLoading(false)
      }
    },
    [isInternetAvailable, grpcClient, setStation]
  )

  return [fetchStationListWithTrainTypes, loading, error]
}

export default useStationList
