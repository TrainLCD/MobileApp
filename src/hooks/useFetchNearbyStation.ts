import { LocationObject } from 'expo-location'
import { useCallback } from 'react'
import { useSetRecoilState } from 'recoil'
import { GetStationByCoordinatesRequest } from '../../gen/proto/stationapi_pb'
import { grpcClient } from '../lib/grpc'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'

export const useFetchNearbyStation = (): ((
  location: LocationObject
) => Promise<void>) => {
  const setStation = useSetRecoilState(stationState)
  const setNavigation = useSetRecoilState(navigationState)

  const fetchStation = useCallback(
    async (location: LocationObject | undefined) => {
      if (!location?.coords) {
        return
      }

      const { latitude, longitude } = location.coords

      const req = new GetStationByCoordinatesRequest({
        latitude,
        longitude,
        limit: 1,
      })

      const data = await grpcClient.getStationsByCoordinates(req)

      if (data) {
        const { stations } = data
        setStation((prev) => ({
          ...prev,
          station:
            prev.station?.id !== stations[0]?.id ? stations[0] : prev.station,
        }))
        setNavigation((prev) => ({
          ...prev,
          stationForHeader:
            prev.stationForHeader?.id !== stations[0]?.id
              ? stations[0]
              : prev.stationForHeader,
        }))
      }
    },
    [setNavigation, setStation]
  )

  return fetchStation
}
