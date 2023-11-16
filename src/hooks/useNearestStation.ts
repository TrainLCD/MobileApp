import findNearest from 'geolib/es/findNearest'
import getDistance from 'geolib/es/getDistance'
import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { COMPUTE_DISTANCE_ACCURACY } from '../constants'
import { Station } from '../gen/stationapi_pb'
import locationState from '../store/atoms/location'
import stationState from '../store/atoms/station'

export const useNearestStation = (): Station.AsObject | null => {
  const { location } = useRecoilValue(locationState)
  const { stations } = useRecoilValue(stationState)

  const { latitude, longitude } = location?.coords ?? {
    latitude: 0,
    longitude: 0,
  }

  const nearestWithoutDistance = useMemo(() => {
    const { latitude: nearestLat, longitude: nearestLon } = findNearest(
      {
        latitude,
        longitude,
      },
      stations.map((sta) => ({
        latitude: sta.latitude,
        longitude: sta.longitude,
      }))
    ) as { latitude: number; longitude: number }

    return (
      stations.find(
        (sta) => sta.latitude === nearestLat && sta.longitude === nearestLon
      ) ?? null
    )
  }, [latitude, longitude, stations])

  const stationWithDistance = useMemo(
    () =>
      stations.find(
        (sta) =>
          sta.latitude === nearestWithoutDistance?.latitude &&
          sta.longitude === nearestWithoutDistance?.longitude
      ),
    [
      nearestWithoutDistance?.latitude,
      nearestWithoutDistance?.longitude,
      stations,
    ]
  )

  const distance = useMemo(
    () =>
      getDistance(
        {
          latitude: nearestWithoutDistance?.latitude ?? 0,
          longitude: nearestWithoutDistance?.longitude ?? 0,
        },
        { latitude, longitude },
        COMPUTE_DISTANCE_ACCURACY
      ) ?? 0,
    [
      latitude,
      longitude,
      nearestWithoutDistance?.latitude,
      nearestWithoutDistance?.longitude,
    ]
  )

  const nearestStation: Station.AsObject | null =
    useMemo(
      () =>
        stationWithDistance && {
          ...stationWithDistance,
          distance,
        },
      [distance, stationWithDistance]
    ) ?? null

  return nearestStation
}
