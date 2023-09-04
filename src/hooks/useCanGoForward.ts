import { useMemo } from 'react'
import { getIsLoopLine } from '../utils/loopLine'
import { useCurrentLine } from './useCurrentLine'
import useCurrentStation from './useCurrentStation'
import useCurrentTrainType from './useCurrentTrainType'
import { useNextStation } from './useNextStation'
import useSortedDistanceStations from './useSortedDistanceStations'

const useCanGoForward = (): boolean => {
  const currentLine = useCurrentLine()
  const currentStation = useCurrentStation()
  const nextStation = useNextStation()
  const sortedStations = useSortedDistanceStations()
  const trainType = useCurrentTrainType()

  const canGoForward = useMemo(() => {
    if (getIsLoopLine(currentLine, trainType)) {
      return true
    }

    const nearestStation = sortedStations[0]

    // 次の駅が存在すれば無条件で次に進めるが、
    // 次の駅が存在しなくとも停車中の終点駅と地理的な最寄り駅が違う場合は通す(終点から後ろに戻る場合を想定)
    return !!nextStation || currentStation?.groupId !== nearestStation?.groupId
  }, [
    currentLine,
    currentStation?.groupId,
    nextStation,
    sortedStations,
    trainType,
  ])

  return canGoForward
}

export default useCanGoForward
