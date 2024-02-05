import { LocationObject } from 'expo-location'
import { useCallback } from 'react'
import { useSetRecoilState } from 'recoil'
import { GetStationByCoordinatesRequest } from '../../gen/proto/stationapi_pb'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import useGRPC from './useGRPC'

const useFetchNearbyStation = (): ((
  location: LocationObject
) => Promise<void>) => {
  const setStation = useSetRecoilState(stationState)
  const setNavigation = useSetRecoilState(navigationState)

  const grpcClient = useGRPC()

  const fetchStation = useCallback(
    async (location: LocationObject | undefined) => {
      if (!location?.coords) {
        return
      }

      const { latitude, longitude } = location.coords

      const req = new GetStationByCoordinatesRequest()
      req.latitude = latitude
      req.longitude = longitude
      req.limit = 1

      const data = await grpcClient?.getStationsByCoordinates(req)

      if (data) {
        const { stations } = data
        setStation((prev) => ({
          ...prev,
          station: stations[0],
        }))
        setNavigation((prev) => ({
          ...prev,
          stationForHeader: stations[0],
        }))
      }
    },
    [grpcClient, setNavigation, setStation]
  )

  return fetchStation
}

export default useFetchNearbyStation
