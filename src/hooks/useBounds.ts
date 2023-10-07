import { useEffect, useMemo, useState } from 'react'

import { useRecoilValue } from 'recoil'
import { Station } from '../gen/stationapi_pb'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import getCurrentStationIndex from '../utils/currentStationIndex'
import {
  getIsMeijoLine,
  getIsOsakaLoopLine,
  getIsYamanoteLine,
  inboundStationsForLoopLine,
  outboundStationsForLoopLine,
} from '../utils/loopLine'
import { useCurrentLine } from './useCurrentLine'
import useCurrentStation from './useCurrentStation'

const useBounds = (): {
  bounds: [Station.AsObject[], Station.AsObject[]]
} => {
  const [bounds, setBounds] = useState<
    [Station.AsObject[], Station.AsObject[]]
  >([[], []])
  const { stations } = useRecoilValue(stationState)
  const { trainType } = useRecoilValue(navigationState)

  const currentStation = useCurrentStation()
  const currentLine = useCurrentLine()

  const yamanoteLine = useMemo(
    () => currentLine && getIsYamanoteLine(currentLine.id),
    [currentLine]
  )
  const osakaLoopLine = useMemo(
    () => currentLine && !trainType && getIsOsakaLoopLine(currentLine.id),
    [currentLine, trainType]
  )
  const meijoLine = useMemo(
    () => currentLine && getIsMeijoLine(currentLine.id),
    [currentLine]
  )

  const currentIndex = useMemo(
    () => getCurrentStationIndex(stations, currentStation),
    [currentStation, stations]
  )

  useEffect(() => {
    const inboundStations = inboundStationsForLoopLine(
      stations,
      stations[currentIndex],
      currentLine
    )
    const outboundStations = outboundStationsForLoopLine(
      stations,
      stations[currentIndex],
      currentLine
    )

    const inboundStation = stations[stations.length - 1]
    const outboundStation = stations[0]

    let computedInboundStation: Station.AsObject[] = []
    let computedOutboundStation: Station.AsObject[] = []

    if (yamanoteLine || meijoLine || (osakaLoopLine && !trainType)) {
      computedInboundStation = inboundStations
      computedOutboundStation = outboundStations
    } else {
      if (inboundStation?.groupId !== currentStation?.groupId) {
        computedInboundStation = [inboundStation]
      }
      if (outboundStation?.groupId !== currentStation?.groupId) {
        computedOutboundStation = [outboundStation]
      }
    }

    setBounds([computedInboundStation, computedOutboundStation])
  }, [
    currentIndex,
    currentLine,
    currentStation?.groupId,
    meijoLine,
    osakaLoopLine,
    stations,
    trainType,
    yamanoteLine,
  ])

  return { bounds }
}

export default useBounds
