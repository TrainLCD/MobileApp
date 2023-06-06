import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { Station } from '../models/StationAPI'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import dropEitherJunctionStation from '../utils/dropJunctionStation'
import getNextStation from '../utils/getNextStation'
import {
  getNextInboundStopStation,
  getNextOutboundStopStation,
} from '../utils/nextStation'

const useNextStation = (
  ignorePass = true,
  originStation?: Station
): Station | undefined => {
  const {
    station: stationFromState,
    stations: stationsFromState,
    selectedDirection,
  } = useRecoilValue(stationState)
  const { leftStations } = useRecoilValue(navigationState)

  const station = useMemo(
    () => originStation ?? stationFromState,
    [originStation, stationFromState]
  )

  const stations = useMemo(
    () => dropEitherJunctionStation(stationsFromState, selectedDirection),
    [selectedDirection, stationsFromState]
  )

  const actualNextStation = useMemo(
    () => (station && getNextStation(leftStations, station)) ?? undefined,
    [leftStations, station]
  )

  const nextInboundStopStation = useMemo(
    () =>
      actualNextStation &&
      station &&
      getNextInboundStopStation(
        stations,
        actualNextStation,
        station,
        ignorePass
      ),
    [actualNextStation, ignorePass, station, stations]
  )

  const nextOutboundStopStation = useMemo(
    () =>
      actualNextStation &&
      station &&
      getNextOutboundStopStation(
        stations,
        actualNextStation,
        station,
        ignorePass
      ),
    [actualNextStation, ignorePass, station, stations]
  )

  return (
    (selectedDirection === 'INBOUND'
      ? nextInboundStopStation
      : nextOutboundStopStation) ?? undefined
  )
}

export default useNextStation
