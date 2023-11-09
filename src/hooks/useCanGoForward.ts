import { useMemo } from 'react'
import useCurrentStation from './useCurrentStation'
import { useLoopLine } from './useLoopLine'
import { useNextStation } from './useNextStation'
import useSortedDistanceStations from './useSortedDistanceStations'

const useCanGoForward = (): boolean => {
  const currentStation = useCurrentStation()
  const nextStation = useNextStation()
  const sortedStations = useSortedDistanceStations()

  const { isLoopLine } = useLoopLine()

  const canGoForward = useMemo(() => {
    if (isLoopLine) {
      return true
    }

    const nearestStation = sortedStations[0]

    // 次の駅が存在すれば無条件で次に進めるが、
    // 次の駅が存在しなくとも停車中の終点駅と地理的な最寄り駅が違う場合は通す(終点から後ろに戻る場合を想定)
    return !!nextStation || currentStation?.groupId !== nearestStation?.groupId
  }, [currentStation?.groupId, isLoopLine, nextStation, sortedStations])

  return canGoForward
}

export default useCanGoForward
