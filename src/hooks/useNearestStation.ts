import findNearest from 'geolib/es/findNearest'
import getDistance from 'geolib/es/getDistance'
import getLatitude from 'geolib/es/getLatitude'
import getLongitude from 'geolib/es/getLongitude'
import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { Station } from '../gen/stationapi_pb'
import locationState from '../store/atoms/location'
import stationState from '../store/atoms/station'
import { useAccuracy } from './useAccuracy'

export const useNearestStation = (): Station.AsObject | null => {
  const { location } = useRecoilValue(locationState)
  const { stations } = useRecoilValue(stationState)
  const { computeDistanceAccuracy } = useAccuracy()

  const nearestWithoutDistance = useMemo(() => {
    if (!location?.coords) {
      return null
    }

    const { latitude, longitude } = location.coords

    const nearestCoordinates = stations.length
      ? findNearest(
          {
            latitude,
            longitude,
          },
          stations.map((sta) => ({
            latitude: sta?.latitude,
            longitude: sta?.longitude,
          }))
        )
      : null

    if (!nearestCoordinates) {
      return null
    }

    const lat = getLatitude(nearestCoordinates)
    const lon = getLongitude(nearestCoordinates)

    return stations.find(
      (sta) => sta?.latitude === lat && sta?.longitude === lon
    )
  }, [location?.coords, stations])

  const stationWithDistance = useMemo(
    () =>
      stations.find(
        (sta) =>
          sta?.latitude === nearestWithoutDistance?.latitude &&
          sta?.longitude === nearestWithoutDistance?.longitude
      ),
    [
      nearestWithoutDistance?.latitude,
      nearestWithoutDistance?.longitude,
      stations,
    ]
  )

  const distance = useMemo(() => {
    if (!location?.coords) {
      return null
    }
    const { latitude, longitude } = location.coords
    return (
      getDistance(
        {
          latitude: nearestWithoutDistance?.latitude ?? 0,
          longitude: nearestWithoutDistance?.longitude ?? 0,
        },
        { latitude, longitude },
        computeDistanceAccuracy
      ) ?? 0
    )
  }, [
    computeDistanceAccuracy,
    location?.coords,
    nearestWithoutDistance?.latitude,
    nearestWithoutDistance?.longitude,
  ])

  const nearestStation: Station.AsObject | null = useMemo(
    () =>
      (stationWithDistance && {
        ...stationWithDistance,
        distance: distance ?? 0,
      }) ??
      null,
    [distance, stationWithDistance]
  )

  return nearestStation
}
