import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { Station } from '../gen/stationapi_pb'
import stationState from '../store/atoms/station'
import getIsPass from '../utils/isPass'
import getSlicedStations from '../utils/slicedStations'
import { useCurrentLine } from './useCurrentLine'
import useCurrentStation from './useCurrentStation'
import useCurrentTrainType from './useCurrentTrainType'
import { useNextStation } from './useNextStation'

export const useAfterNextStation = () => {
  const { stations, selectedDirection, arrived } = useRecoilValue(stationState)
  const currentStation = useCurrentStation()
  const nextStation = useNextStation()
  const currentLine = useCurrentLine()
  const currentTrainType = useCurrentTrainType()

  const slicedStationsOrigin = useMemo(
    () =>
      getSlicedStations({
        stations,
        currentStation,
        isInbound: selectedDirection === 'INBOUND',
        arrived,
        currentLine,
        currentTrainType,
      }),
    [
      arrived,
      currentLine,
      currentStation,
      currentTrainType,
      selectedDirection,
      stations,
    ]
  )

  // 直通時、同じGroupIDの駅が違う駅として扱われるのを防ぐ(ex. 渋谷の次は、渋谷に止まります)
  const slicedStations = useMemo(
    () =>
      Array.from(new Set(slicedStationsOrigin.map((s) => s.groupId)))
        .map((gid) => slicedStationsOrigin.find((s) => s.groupId === gid))
        .filter((s) => !!s) as Station.AsObject[],
    [slicedStationsOrigin]
  )

  const afterNextStation = useMemo(
    () =>
      slicedStations.find((s) => {
        if (s.id === currentStation?.id) {
          return false
        }
        if (s.id === nextStation?.id) {
          return false
        }
        return !getIsPass(s)
      }),
    [currentStation?.id, nextStation?.id, slicedStations]
  )

  return afterNextStation
}
