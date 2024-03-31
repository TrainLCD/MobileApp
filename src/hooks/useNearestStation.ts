import findNearest from 'geolib/es/findNearest'
import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { Station } from '../../gen/proto/stationapi_pb'
import stationState from '../store/atoms/station'
import { useLocationStore } from './useLocationStore'

export const useNearestStation = (): Station | null => {
  const location = useLocationStore((state) => state.location)
  const { stations } = useRecoilValue(stationState)

  const nearestStation = useMemo<Station | null>(() => {
    if (!location?.coords) {
      return null
    }

    const { latitude, longitude } = location.coords

    const nearestCoordinates = stations.length
      ? (findNearest(
          {
            latitude,
            longitude,
          },
          stations.map((sta) => ({
            latitude: sta.latitude,
            longitude: sta.longitude,
          }))
        ) as { latitude: number; longitude: number })
      : null

    if (!nearestCoordinates) {
      return null
    }

    return (
      stations.find(
        (sta) =>
          sta.latitude === nearestCoordinates.latitude &&
          sta.longitude === nearestCoordinates.longitude
      ) ?? null
    )
  }, [location?.coords, stations])

  return nearestStation
}
