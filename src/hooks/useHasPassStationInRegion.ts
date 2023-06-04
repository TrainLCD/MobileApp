import { useMemo } from 'react'
import { Station } from '../models/StationAPI'
import getIsPass from '../utils/isPass'

const useHasPassStationInRegion = (
  stations: Station[],
  prevStation: Station | null,
  nextStation: Station | null
): boolean => {
  const prevStationIndex = useMemo(
    () => stations.findIndex((s) => s.groupId === prevStation?.groupId),
    [prevStation?.groupId, stations]
  )
  const nextStationIndex = useMemo(
    () => stations.findIndex((s) => s.groupId === nextStation?.groupId),
    [nextStation?.groupId, stations]
  )

  if (prevStationIndex < nextStationIndex) {
    const innerStations = stations.slice(prevStationIndex + 1, nextStationIndex)
    return innerStations.some((s) => getIsPass(s))
  }

  if (prevStationIndex > nextStationIndex) {
    const innerStations = stations.slice(nextStationIndex + 1, prevStationIndex)
    return innerStations.some((s) => getIsPass(s))
  }

  return false
}

export default useHasPassStationInRegion
