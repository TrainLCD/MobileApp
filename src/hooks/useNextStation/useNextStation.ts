import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { Station } from '../../gen/stationapi_pb'
import { APP_THEME } from '../../models/Theme'
import stationState from '../../store/atoms/station'
import themeState from '../../store/atoms/theme'
import dropEitherJunctionStation from '../../utils/dropJunctionStation'
import {
  getNextInboundStopStation,
  getNextOutboundStopStation,
} from '../../utils/nextStation'
import useCurrentStation from '../useCurrentStation'
import { useLoopLine } from '../useLoopLine'

export const useNextStation = (
  ignorePass = true,
  originStation?: Station.AsObject
): Station.AsObject | undefined => {
  const { stations: stationsFromState, selectedDirection } =
    useRecoilValue(stationState)
  const { theme } = useRecoilValue(themeState)
  const currentStation = useCurrentStation({
    skipPassStation: theme === APP_THEME.JR_WEST || theme === APP_THEME.LED,
  })
  const { isLoopLine } = useLoopLine()

  const station = useMemo(
    () => originStation ?? currentStation,
    [originStation, currentStation]
  )

  const stations = useMemo(
    () => dropEitherJunctionStation(stationsFromState, selectedDirection),
    [selectedDirection, stationsFromState]
  )

  const actualNextStation = useMemo(() => {
    if (isLoopLine) {
      const loopLineStationIndex =
        selectedDirection === 'INBOUND'
          ? stations.findIndex((s) => s?.groupId === station?.groupId) - 1
          : stations.findIndex((s) => s?.groupId === station?.groupId) + 1

      if (!stations[loopLineStationIndex]) {
        return stations[
          selectedDirection === 'INBOUND' ? stations.length - 1 : 0
        ]
      }

      return stations[loopLineStationIndex]
    }

    const notLoopLineStationIndex =
      selectedDirection === 'INBOUND'
        ? stations.findIndex((s) => s?.groupId === station?.groupId) + 1
        : stations.findIndex((s) => s?.groupId === station?.groupId) - 1

    return stations[notLoopLineStationIndex]
  }, [isLoopLine, selectedDirection, station?.groupId, stations])

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
