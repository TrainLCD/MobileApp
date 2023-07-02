import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { Station } from '../gen/stationapi_pb'
import { APP_THEME } from '../models/Theme'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import themeState from '../store/atoms/theme'
import dropEitherJunctionStation from '../utils/dropJunctionStation'
import {
  getNextInboundStopStation,
  getNextOutboundStopStation,
} from '../utils/nextStation'
import useCurrentStation from './useCurrentStation'

const useNextStation = (
  ignorePass = true,
  originStation?: Station.AsObject
): Station.AsObject | undefined => {
  const { stations: stationsFromState, selectedDirection } =
    useRecoilValue(stationState)
  const { leftStations } = useRecoilValue(navigationState)
  const { theme } = useRecoilValue(themeState)
  const currentStation = useCurrentStation({
    skipPassStation: theme === APP_THEME.JR_WEST,
  })

  const station = useMemo(
    () => originStation ?? currentStation,
    [originStation, currentStation]
  )

  const stations = useMemo(
    () => dropEitherJunctionStation(stationsFromState, selectedDirection),
    [selectedDirection, stationsFromState]
  )

  const actualNextStation = useMemo(() => {
    const index =
      leftStations.findIndex((s) => s?.groupId === station?.groupId) + 1
    return leftStations[index]
  }, [leftStations, station?.groupId])

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
