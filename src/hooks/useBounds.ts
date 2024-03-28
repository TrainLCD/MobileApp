import { useMemo } from 'react'

import { useRecoilValue } from 'recoil'
import { Station } from '../../gen/proto/stationapi_pb'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import { currentStationSelector } from '../store/selectors/currentStation'
import { useLoopLine } from './useLoopLine'

const useBounds = (): {
  bounds: [Station[], Station[]]
} => {
  const { stations } = useRecoilValue(stationState)
  const { trainType } = useRecoilValue(navigationState)
  const currentStation = useRecoilValue(currentStationSelector({}))

  const {
    isLoopLine,
    inboundStationsForLoopLine,
    outboundStationsForLoopLine,
  } = useLoopLine()

  const bounds = useMemo((): [Station[], Station[]] => {
    const inboundStation = stations[stations.length - 1]
    const outboundStation = stations[0]

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
    currentStation?.groupId,
    inboundStationsForLoopLine,
    isLoopLine,
    outboundStationsForLoopLine,
    stations,
    trainType,
  ])

  return { bounds }
}

export default useBounds
