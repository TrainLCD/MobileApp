import { LocationObject } from 'expo-location'
import { useCallback } from 'react'
import { useSetRecoilState } from 'recoil'
import { GetStationByCoordinatesRequest } from '../../gen/proto/stationapi_pb'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import { getDeadline } from '../utils/deadline'
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
        req.setLatitude(latitude)
        req.setLongitude(longitude)
        req.setLimit(1)

        const deadline = getDeadline()
        const data = (
          await grpcClient?.getStationsByCoordinates(req, {
            deadline,
          })
        )?.toObject()

        if (data) {
          const { stationsList } = data
          setStation((prev) => ({
            ...prev,
            station: stationsList[0],
          }))
          setNavigation((prev) => ({
            ...prev,
            stationForHeader: stationsList[0],
          }))
        }
        setStation((prev) => ({
          ...prev,
          fetchStationError: null,
        }))
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
