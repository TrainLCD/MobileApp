import { useMemo } from 'react'

import { useRecoilValue } from 'recoil'
import { Station } from '../../gen/proto/stationapi_pb'
import { TOEI_OEDO_LINE_ID } from '../constants'
import { TOEI_OEDO_LINE_MAJOR_STATIONS_ID } from '../constants/station'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import { currentLineSelector } from '../store/selectors/currentLine'
import { currentStationSelector } from '../store/selectors/currentStation'
import { useLoopLine } from './useLoopLine'

const useBounds = (): {
  bounds: [Station[], Station[]]
  directionalStops: Station[]
} => {
  const { stations, selectedDirection } = useRecoilValue(stationState)
  const { trainType } = useRecoilValue(navigationState)
  const currentStation = useRecoilValue(currentStationSelector({}))
  const currentLine = useRecoilValue(currentLineSelector)

  const {
    isLoopLine,
    inboundStationsForLoopLine,
    outboundStationsForLoopLine,
  } = useLoopLine()

  const bounds = useMemo((): [Station[], Station[]] => {
    const inboundStation = stations[stations.length - 1]
    const outboundStation = stations[0]

    if (TOEI_OEDO_LINE_ID === currentLine?.id) {
      const stationIndex = stations.findIndex(
        (s) => s.groupId === currentStation?.groupId
      )
      const oedoLineInboundStops = stations
        .slice(stationIndex - 1, stations.length)
        .filter(
          (s) =>
            s.groupId !== currentStation?.groupId &&
            TOEI_OEDO_LINE_MAJOR_STATIONS_ID.includes(s.id)
        )
      const oedoLineOutboundStops = stations
        .slice(0, stationIndex - 1)
        .reverse()
        .filter(
          (s) =>
            s.groupId !== currentStation?.groupId &&
            TOEI_OEDO_LINE_MAJOR_STATIONS_ID.includes(s.id)
        )

      return [oedoLineInboundStops, oedoLineOutboundStops]
    }

    if (isLoopLine && !trainType) {
      return [inboundStationsForLoopLine, outboundStationsForLoopLine]
    }

    if (
      inboundStation?.groupId !== currentStation?.groupId ||
      outboundStation?.groupId !== currentStation?.groupId
    ) {
      return [[inboundStation], [outboundStation]]
    }

    return [[], []]
  }, [
    currentLine?.id,
    currentStation?.groupId,
    inboundStationsForLoopLine,
    isLoopLine,
    outboundStationsForLoopLine,
    stations,
    trainType,
  ])

  const directionalStops = useMemo(
    () =>
      bounds[selectedDirection === 'INBOUND' ? 0 : 1]
        .filter((s) => !!s)
        .slice(0, 2),
    [bounds, selectedDirection]
  )

  return { bounds, directionalStops }
}

export default useBounds
