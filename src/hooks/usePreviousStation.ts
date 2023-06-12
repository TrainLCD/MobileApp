import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { Station } from '../models/StationAPI'
import stationState from '../store/atoms/station'
import dropEitherJunctionStation from '../utils/dropJunctionStation'
import getIsPass from '../utils/isPass'
import useCurrentStation from './useCurrentStation'

const usePreviousStation = (): Station | undefined => {
  const { stations: stationsFromState, selectedDirection } =
    useRecoilValue(stationState)

  const stations = useMemo(
    () => dropEitherJunctionStation(stationsFromState, selectedDirection),
    [selectedDirection, stationsFromState]
  )

  const station = useCurrentStation({
    skipPassStation: true,
    withTrainTypes: true,
  })
  const reversedStations = useMemo(
    () =>
      selectedDirection === 'INBOUND' ? stations : stations.slice().reverse(),
    [selectedDirection, stations]
  )

  const currentStationIndex = useMemo(
    () => reversedStations.findIndex((s) => s.groupId === station?.groupId) + 1,
    [reversedStations, station?.groupId]
  )
  const beforeStations = useMemo(
    () =>
      reversedStations
        .slice(0, currentStationIndex)
        .filter((s) => !getIsPass(s)),
    [currentStationIndex, reversedStations]
  )

  if (currentStationIndex === -1) {
    return station ?? undefined
  }

  return beforeStations[beforeStations.length - 1]
}

export default usePreviousStation
