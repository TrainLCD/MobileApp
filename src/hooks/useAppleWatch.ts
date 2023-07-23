import { useCallback, useEffect, useMemo } from 'react'
import { sendMessage, useReachability } from 'react-native-watch-connectivity'
import { useRecoilValue } from 'recoil'
import { parenthesisRegexp } from '../constants/regexp'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import getIsPass from '../utils/isPass'
import { getIsLoopLine } from '../utils/loopLine'
import useCurrentLine from './useCurrentLine'
import useCurrentStateKey from './useCurrentStateKey'
import useNextStation from './useNextStation'
import useNumbering from './useNumbering'

const useAppleWatch = (): void => {
  const { arrived, station, stations, selectedDirection } =
    useRecoilValue(stationState)
  const { trainType } = useRecoilValue(navigationState)
  const reachable = useReachability()
  const currentLine = useCurrentLine()
  const [currentNumbering] = useNumbering()
  const nextStation = useNextStation()
  const currentStateKey = useCurrentStateKey()

  const switchedStation = useMemo(
    () => (arrived && station && !getIsPass(station) ? station : nextStation),
    [arrived, nextStation, station]
  )

  const inboundStations = useMemo(() => {
    if (getIsLoopLine(currentLine, trainType)) {
      return stations.slice().reverse()
    }
    return stations
  }, [currentLine, stations, trainType]).map((s) => ({
    ...s,
    distance: -1,
  }))

  const outboundStations = useMemo(() => {
    if (getIsLoopLine(currentLine, trainType)) {
      return stations
    }
    return stations.slice().reverse()
  }, [currentLine, stations, trainType]).map((s) => ({
    ...s,
    distance: -1,
  }))

  const sendToWatch = useCallback(async (): Promise<void> => {
    if (switchedStation) {
      const msg = {
        state: currentStateKey,
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
              nameR: l.nameRoman.replace(parenthesisRegexp, ''),
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
              nameR: l.nameRoman.replace(parenthesisRegexp, ''),
            })),
          stationNumber: s?.stationNumbersList?.[0]?.stationNumber,
          pass: getIsPass(s),
        })),
        selectedLine: {
          id: currentLine.id,
          name: currentLine.nameShort.replace(parenthesisRegexp, ''),
          nameR: currentLine.nameRoman.replace(parenthesisRegexp, ''),
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
    currentStateKey,
    inboundStations,
    outboundStations,
    selectedDirection,
    switchedStation,
  ])

  useEffect(() => {
    if (reachable) {
      sendToWatch()
    }
  }, [sendToWatch, reachable])
}

export default useAppleWatch
