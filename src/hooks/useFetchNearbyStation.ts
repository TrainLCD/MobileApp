import { useCallback } from 'react'
import useSWRMutation from 'swr/mutation'
import { GetStationByCoordinatesRequest } from '../../gen/proto/stationapi_pb'
import { grpcClient } from '../lib/grpc'

export const useFetchNearbyStation = () => {
  const fetchStation = useCallback(
    async (
      _: string,
      { arg }: { arg: { latitude: number; longitude: number } | undefined }
    ) => {
      if (!arg) {
        return
      }

      const { latitude, longitude } = arg
      const req = new GetStationByCoordinatesRequest({
        latitude,
        longitude,
        limit: 1,
      })

      const data = await grpcClient.getStationsByCoordinates(req)
      return data.stations[0]
    },
    []
  )

  const { trigger } = useSWRMutation(
    '/app.trainlcd.grpc/getStationsByCoordinates',
    fetchStation
  )

  return trigger
}
