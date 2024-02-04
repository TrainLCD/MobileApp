import { LocationObject } from 'expo-location'
import { useCallback } from 'react'
import { useSetRecoilState } from 'recoil'
import { GetStationByCoordinatesRequest } from '../../gen/proto/stationapi_pb'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import useGRPC from './useGRPC'

type PickedLocation = Pick<LocationObject, 'coords'>

// 読み込み中もしくはエラーの場合は、fetchStationLoading, fetchStationErrorがtrueになるので注意
const useFetchNearbyStation = (): ((
  location: PickedLocation
) => Promise<void>) => {
  const setStation = useSetRecoilState(stationState)
  const setNavigation = useSetRecoilState(navigationState)

  const grpcClient = useGRPC()

  const fetchStation = useCallback(
    async (location: PickedLocation | undefined) => {
      if (!location?.coords) {
        return
      }

      try {
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
      } catch (_err) {
        const err = _err as Error
        setStation((prev) => ({
          ...prev,
          fetchStationError: err,
        }))
      }
    },
    [grpcClient, setNavigation, setStation]
  )

  return fetchStation
}

export default useFetchNearbyStation
