import useSWRMutation from 'swr/dist/mutation'
import { GetStationsByLineGroupIdRequest } from '../../gen/proto/stationapi_pb'
import { grpcClient } from '../lib/grpc'

export const useTrainTypeStations = () => {
  const {
    data: stations,
    isMutating: isLoading,
    error,
    trigger: fetchStations,
  } = useSWRMutation(
    '/app.trainlcd.grpc/GetStationsByLineGroupId',
    async (_, { arg: { lineGroupId } }: { arg: { lineGroupId: number } }) => {
      const req = new GetStationsByLineGroupIdRequest({
        lineGroupId,
      })
      const res = await grpcClient.getStationsByLineGroupId(req)
      return res.stations ?? []
    }
  )

  return { stations, isLoading, error, fetchStations }
}
