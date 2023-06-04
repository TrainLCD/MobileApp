import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { Station } from '../models/StationAPI'
import { APP_THEME } from '../models/Theme'
import stationState from '../store/atoms/station'
import themeState from '../store/atoms/theme'
import dropEitherJunctionStation from '../utils/dropJunctionStation'
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
  const { theme } = useRecoilValue(themeState)

  const station = useMemo(
    () => originStation ?? stationFromState,
    [originStation, stationFromState]
  )

  const stations = useMemo(
    () => dropEitherJunctionStation(stationsFromState, selectedDirection),
    [selectedDirection, stationsFromState]
  )

  // JRWテーマで自由が丘-学芸大学間が通過と表示されないので `getNextStation` から取り出した値だけど後で `getNextStation` にマージしたい
  const actualNextStation = useMemo(() => {
    if (theme === APP_THEME.JR_WEST) {
      switch (selectedDirection) {
        case 'INBOUND': {
          const index =
            stations.findIndex((s) => s?.groupId === station?.groupId) + 1
          return stations[index]
        }
        case 'OUTBOUND': {
          const index =
            stations.findIndex((s) => s?.groupId === station?.groupId) - 1
          return stations[index]
        }
      }
    }
    const index = stations.findIndex((s) => s?.groupId === station?.groupId) + 1
    return stations[index]
  }, [selectedDirection, station?.groupId, stations, theme])

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
