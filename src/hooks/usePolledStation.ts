import { useDebounce } from 'ahooks'
import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import useSWR from 'swr'
import {
  CoordinatesRequest,
  DistanceResponseState,
} from '../../gen/proto/stationapi_pb'
import { grpcClient } from '../lib/grpc'
import stationState from '../store/atoms/station'
import { currentLineSelector } from '../store/selectors/currentLine'
import { useLocationStore } from './useLocationStore'

export const usePolledStation = () => {
  const { stations } = useRecoilValue(stationState)
  const location = useLocationStore((state) => state.location)
  const currentLine = useRecoilValue(currentLineSelector)
  const debouncedCoords = useDebounce(location?.coords, {
    wait: 10000,
    maxWait: 30000,
  })

  const { data, error } = useSWR(
    [
      '/app.trainlcd.grpc/getDistanceForClosestStationFromCoordinates',
      currentLine?.id,
      debouncedCoords?.latitude,
      debouncedCoords?.longitude,
    ],
    ([, lineId, latitude, longitude]) => {
      if (!lineId || !latitude || !longitude) {
        return
      }

      return grpcClient.getDistanceForClosestStationFromCoordinates(
        new CoordinatesRequest({ latitude, longitude, lineId })
      )
    }
  )

  const isApproaching = useMemo(
    () => data?.state === DistanceResponseState.Approaching ?? false,
    [data?.state]
  )
  const isArrived = useMemo(
    () => data?.state === DistanceResponseState.Arrived ?? false,
    [data?.state]
  )

  return {
    station: stations.find((s) => s.id === data?.stationId) ?? null,
    error,
    isApproaching,
    isArrived,
  }
}
