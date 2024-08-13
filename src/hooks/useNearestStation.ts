import findNearest from 'geolib/es/findNearest'
import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { Station } from '../../gen/proto/stationapi_pb'
import stationState from '../store/atoms/station'
import { useLocationStore } from './useLocationStore'

export const useNearestStation = (): Station | null => {
  const latitude = useLocationStore((state) => state?.coords.latitude)
  const longitude = useLocationStore((state) => state?.coords.longitude)
  const { stations } = useRecoilValue(stationState)

  const nearestStation = useMemo<Station | null>(() => {
    if (!latitude || !longitude) {
      return null
    }

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
  }, [latitude, longitude, stations])

  return nearestStation
}
