import { useCallback, useEffect, useMemo } from 'react'
import { sendMessage, useReachability } from 'react-native-watch-connectivity'
import { useRecoilValue } from 'recoil'
import { parenthesisRegexp } from '../constants'
import stationState from '../store/atoms/station'
import { currentLineSelector } from '../store/selectors/currentLine'
import { currentStationSelector } from '../store/selectors/currentStation'
import getIsPass from '../utils/isPass'
import { useLoopLine } from './useLoopLine'
import { useNextStation } from './useNextStation'
import { useNumbering } from './useNumbering'
import { useStoppingState } from './useStoppingState'

const useAppleWatch = (): void => {
  const { arrived, stations, selectedDirection } = useRecoilValue(stationState)
  const station = useRecoilValue(currentStationSelector({}))
  const currentLine = useRecoilValue(currentLineSelector)

  const reachable = useReachability()
  const [currentNumbering] = useNumbering()
  const nextStation = useNextStation()
  const stoppingState = useStoppingState()
  const { isLoopLine } = useLoopLine()

  const switchedStation = useMemo(
    () => (arrived && !getIsPass(station) ? station : nextStation),
    [arrived, nextStation, station]
  )

  const inboundStations = useMemo(() => {
    if (isLoopLine) {
      return stations.slice().reverse()
    }
    return stations
  }, [isLoopLine, stations]).map((s) => ({
    ...s,
    distance: 0,
  }))

  const outboundStations = useMemo(() => {
    if (isLoopLine) {
      return stations
    }
    return stations.slice().reverse()
  }, [isLoopLine, stations]).map((s) => ({
    ...s,
    distance: 0,
  }))

  const sendToWatch = useCallback(async (): Promise<void> => {
    if (switchedStation) {
      const msg = {
        state: stoppingState,
        station: {
          id: switchedStation.id,
          name: switchedStation.name,
          nameR: switchedStation.nameRoman,
          lines: switchedStation.linesList
            .filter((l) => l.id !== currentLine?.id)
            .map((l) => ({
              id: l.id,
              lineColorC: l.color,
              name: l.nameShort.replace(parenthesisRegexp, ''),
              nameR: l.nameRoman?.replace(parenthesisRegexp, ''),
            })),
          stationNumber: currentNumbering?.stationNumber,
          pass: false,
        },
      }
      sendMessage(msg)
    }
    if (currentLine) {
      const switchedStations =
        selectedDirection === 'INBOUND' ? inboundStations : outboundStations
      const msg = {
        stationList: switchedStations.map((s) => ({
          id: s.id,
          name: s.name,
          nameR: s.nameRoman,
          lines: s.linesList
            .filter((l) => l.id !== currentLine.id)
            .map((l) => ({
              id: l.id,
              lineColorC: l.color,
              name: l.nameShort.replace(parenthesisRegexp, ''),
              nameR: l.nameRoman?.replace(parenthesisRegexp, ''),
            })),
          stationNumber: s?.stationNumbersList?.[0]?.stationNumber,
          pass: getIsPass(s),
        })),
        selectedLine: {
          id: currentLine.id,
          name: currentLine.nameShort.replace(parenthesisRegexp, ''),
          nameR: currentLine.nameRoman?.replace(parenthesisRegexp, ''),
        },
      }
      sendMessage(msg)
    } else {
      sendMessage({
        stationList: [],
      })
    }
  }, [
    currentLine,
    currentNumbering?.stationNumber,
    inboundStations,
    outboundStations,
    selectedDirection,
    stoppingState,
    switchedStation,
  ])

  useEffect(() => {
    if (reachable) {
      sendToWatch()
    }
  }, [sendToWatch, reachable])
}

export default useAppleWatch
