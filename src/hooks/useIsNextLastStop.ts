import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import { getIsLoopLine } from '../utils/loopLine'
import useCurrentLine from './useCurrentLine'
import useNextStation from './useNextStation'

const useIsNextLastStop = (): boolean => {
  const { selectedBound } = useRecoilValue(stationState)
  const { trainType } = useRecoilValue(navigationState)
  const currentLine = useCurrentLine()
  const nextStation = useNextStation()

  const isNextLastStop = useMemo(() => {
    if (getIsLoopLine(currentLine, trainType)) {
      return false
    }

    return nextStation?.groupId === selectedBound?.groupId
  }, [currentLine, nextStation?.groupId, selectedBound?.groupId, trainType])

  return isNextLastStop
}

export default useIsNextLastStop
