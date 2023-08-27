import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import stationState from '../store/atoms/station'
import { getIsLoopLine } from '../utils/loopLine'
import useCurrentLine from './useCurrentLine'
import useCurrentTrainType from './useCurrentTrainType'
import useNextStation from './useNextStation'

const useIsNextLastStop = (): boolean => {
  const { selectedBound } = useRecoilValue(stationState)
  const currentLine = useCurrentLine()
  const nextStation = useNextStation()
  const trainType = useCurrentTrainType()

  const isNextLastStop = useMemo(() => {
    if (getIsLoopLine(currentLine, trainType)) {
      return false
    }

    return nextStation?.groupId === selectedBound?.groupId
  }, [currentLine, nextStation?.groupId, selectedBound?.groupId, trainType])

  return isNextLastStop
}

export default useIsNextLastStop
