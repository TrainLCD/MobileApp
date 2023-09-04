import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRecoilValue } from 'recoil'
import { Station } from '../../gen/stationapi_pb'
import navigationState from '../../store/atoms/navigation'
import stationState from '../../store/atoms/station'
import getCurrentStationIndex from '../../utils/currentStationIndex'
import dropEitherJunctionStation from '../../utils/dropJunctionStation'
import getIsPass from '../../utils/isPass'
import { getIsLoopLine } from '../../utils/loopLine'
import { useCurrentLine } from '../useCurrentLine'

const useUpcomingStations = (): Station.AsObject[] => {
  const [upcomingStations, setUpcomingStations] = useState<Station.AsObject[]>(
    []
  )
  const { station, stations: stationsFromState } = useRecoilValue(stationState)
  const { selectedDirection } = useRecoilValue(stationState)
  const { trainType } = useRecoilValue(navigationState)

  const currentLine = useCurrentLine()

  const stations = useMemo(
    () => dropEitherJunctionStation(stationsFromState, selectedDirection),
    [stationsFromState, selectedDirection]
  )

  const getStationsForLoopLine = useCallback(
    (currentStationIndex: number): Station.AsObject[] => {
      if (selectedDirection === 'OUTBOUND') {
        const sliced = stations.slice(currentStationIndex)
        if (sliced.length === 1) {
          return [...sliced, ...stations]
        }
        return sliced
      }
      const sliced = stations.slice(0, currentStationIndex + 1).reverse()
      if (sliced.length === 1) {
        return [...sliced, ...stations.slice().reverse()]
      }
      return sliced
    },
    [selectedDirection, stations]
  )

  const getStations = useCallback(
    (currentStationIndex: number): Station.AsObject[] => {
      if (selectedDirection === 'OUTBOUND') {
        return stations.slice(0, currentStationIndex + 1).reverse()
      }
      return stations.slice(currentStationIndex)
    },
    [selectedDirection, stations]
  )

  useEffect(() => {
    const currentIndex = getCurrentStationIndex(stations, station)
    const ns = getIsLoopLine(currentLine, trainType)
      ? getStationsForLoopLine(currentIndex)
      : getStations(currentIndex)
    setUpcomingStations(ns.filter((s) => !getIsPass(s)))
  }, [
    currentLine,
    getStations,
    getStationsForLoopLine,
    station,
    stations,
    trainType,
  ])

  return upcomingStations
}

export default useUpcomingStations
