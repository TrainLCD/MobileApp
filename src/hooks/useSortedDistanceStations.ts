import getDistance from 'geolib/es/getDistance'
import orderByDistance from 'geolib/es/orderByDistance'
import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { Station } from '../gen/stationapi_pb'
import locationState from '../store/atoms/location'
import stationState from '../store/atoms/station'

const useSortedDistanceStations = (): Station.AsObject[] => {
  const { location } = useRecoilValue(locationState)
  const { stations, selectedBound } = useRecoilValue(stationState)

  const scoredStations = useMemo((): Station.AsObject[] => {
    if (location && selectedBound) {
      const { latitude, longitude } = location.coords

      const nearestCoordinates = orderByDistance(
        { latitude, longitude },
        stations.map((sta) => ({
          latitude: parseFloat(sta.latitude.toString()).toPrecision(5),
          longitude: parseFloat(sta.longitude.toString()).toPrecision(5),
        }))
      ) as { latitude: number; longitude: number }[]

      const scoredStations = nearestCoordinates
        .flatMap((nearestCoordinate) =>
          stations.map((sta) =>
            parseFloat(nearestCoordinate.latitude.toString()).toPrecision(5) ===
              parseFloat(sta.latitude.toString()).toPrecision(5) &&
            parseFloat(nearestCoordinate.longitude.toString()).toPrecision(
              5
            ) === parseFloat(sta.longitude.toString()).toPrecision(5)
              ? sta
              : null
          )
        )
        .filter((sta) => sta !== null)
        .map((sta) => ({
          ...sta,
          distance: sta
            ? getDistance(
                { latitude, longitude },
                { latitude: sta?.latitude, longitude: sta?.longitude }
              )
            : 0,
        })) as Station.AsObject[]

      return scoredStations
    }
    return []
  }, [location, selectedBound, stations])

  return scoredStations
}

export default useSortedDistanceStations
