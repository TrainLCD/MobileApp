import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { Station } from '../models/StationAPI'
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
    stations: stationsRaw,
    selectedDirection,
  } = useRecoilValue(stationState)

  const station = useMemo(
    () => originStation ?? stationFromState,
    [originStation, stationFromState]
  )

  const stations = useMemo(
    () => dropEitherJunctionStation(stationsRaw, selectedDirection),
    [selectedDirection, stationsRaw]
  )

  const actualNextStation =
    (station && getNextStation(stations, station)) ?? undefined

  const nextInboundStopStation =
    actualNextStation &&
    station &&
    getNextInboundStopStation(stations, actualNextStation, station, ignorePass)

  const nextOutboundStopStation =
    actualNextStation &&
    station &&
    getNextOutboundStopStation(stations, actualNextStation, station, ignorePass)

  const nextStation =
    selectedDirection === 'INBOUND'
      ? nextInboundStopStation
      : nextOutboundStopStation

  return nextStation ?? undefined
}

export default useNextStation
