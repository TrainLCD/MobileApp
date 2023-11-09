import { useEffect, useState } from 'react'

import { useRecoilValue } from 'recoil'
import { Station } from '../gen/stationapi_pb'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import useCurrentStation from './useCurrentStation'
import { useLoopLine } from './useLoopLine'

const useBounds = (): {
  bounds: [Station.AsObject[], Station.AsObject[]]
} => {
  const [bounds, setBounds] = useState<
    [Station.AsObject[], Station.AsObject[]]
  >([[], []])
  const { stations } = useRecoilValue(stationState)
  const { trainType } = useRecoilValue(navigationState)

  const currentStation = useCurrentStation()
  const {
    isYamanoteLine,
    isMeijoLine,
    isOsakaLoopLine,
    inboundStationsForLoopLine,
    outboundStationsForLoopLine,
  } = useLoopLine()

  useEffect(() => {
    const inboundStation = stations[stations.length - 1]
    const outboundStation = stations[0]

    let computedInboundStation: Station.AsObject[] = []
    let computedOutboundStation: Station.AsObject[] = []

    if (isYamanoteLine || isMeijoLine || (isOsakaLoopLine && !trainType)) {
      computedInboundStation = inboundStationsForLoopLine
      computedOutboundStation = outboundStationsForLoopLine
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
    currentStation?.groupId,
    inboundStationsForLoopLine,
    isMeijoLine,
    isOsakaLoopLine,
    isYamanoteLine,
    outboundStationsForLoopLine,
    stations,
    trainType,
  ])

  return { bounds }
}

export default useBounds
