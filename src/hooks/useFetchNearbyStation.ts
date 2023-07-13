import { LocationObject } from 'expo-location'
import { useCallback, useState } from 'react'
import { useSetRecoilState } from 'recoil'
import { GetStationByCoordinatesRequest } from '../gen/stationapi_pb'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import useGRPC from './useGRPC'

type PickedLocation = Pick<LocationObject, 'coords'>

const useFetchNearbyStation = (): [
  (location: PickedLocation) => Promise<void>,
  boolean,
  any
] => {
  const setStation = useSetRecoilState(stationState)
  const setNavigation = useSetRecoilState(navigationState)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
        const data = (
          await grpcClient?.getStationsByCoordinates(req, null)
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
        setLoading(false)
      } catch (err) {
        setError(err as any)
        setLoading(false)
      }
    },
    [grpcClient, setNavigation, setStation]
  )

  return [fetchStation, loading, error]
}

export default useFetchNearbyStation
