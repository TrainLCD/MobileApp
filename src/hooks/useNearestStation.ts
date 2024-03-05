import findNearest from 'geolib/es/findNearest'
import getDistance from 'geolib/es/getDistance'
import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { Station } from '../../gen/proto/stationapi_pb'
import locationState from '../store/atoms/location'
import stationState from '../store/atoms/station'
import { accuracySelector } from '../store/selectors/accuracy'
import useIsNextLastStop from './useIsNextLastStop'

export const useNearestStation = (): Station | null => {
  const { location } = useRecoilValue(locationState)
  const { stations } = useRecoilValue(stationState)
  const { computeDistanceAccuracy } = useRecoilValue(accuracySelector)

  const isNextLastStop = useIsNextLastStop()

  const nearestStations = useMemo<Station[]>(() => {
    if (!location?.coords) {
      return []
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
      return []
    }

    return (
      stations.filter(
        (sta) =>
          sta.latitude === nearestCoordinates.latitude &&
          sta.longitude === nearestCoordinates.longitude
      ) ?? []
    )
  }, [location?.coords, stations])

  const distance = useMemo<number | undefined>(() => {
    if (!location?.coords) {
      return
    }
    const { latitude, longitude } = location.coords
    return getDistance(
      {
        latitude: nearestStations[0]?.latitude ?? 0,
        longitude: nearestStations[0]?.longitude ?? 0,
      },
      { latitude, longitude },
      computeDistanceAccuracy
    )
  }, [computeDistanceAccuracy, location?.coords, nearestStations])

  const nearestStation: Station | null = useMemo(() => {
    const nearest = nearestStations.find((s) => {
      if (nearestStations.length < 2) {
        return true
      }
      if (isNextLastStop) {
        return s.id === 9930101
      }
      return s.id === 9930199
    })

    if (!nearest) {
      return null
    }

    return new Station({ ...nearest, distance })
  }, [distance, isNextLastStop, nearestStations])

  return nearestStation
}
