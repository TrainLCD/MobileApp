import { useMemo } from 'react'
import { useSlicedStations } from './useSlicedStations'
import getIsPass from '../utils/isPass'
import { Station } from '../../gen/proto/stationapi_pb'

export const useBeforeStopFromTerminus = () => {
  const stations = useSlicedStations()

  const beforeTerminusStations = useMemo(
    () =>
      stations
        .slice()
        .reverse()
        .reduce<Station[]>((acc, cur) => {
          if (acc.some((s) => getIsPass(s))) {
            return acc
          }

          return [...acc, cur]
        }, [])
        .reverse()
        .filter((s) => !getIsPass(s)),
    [stations]
  )

  return beforeTerminusStations
}
