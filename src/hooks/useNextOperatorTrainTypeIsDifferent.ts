import { useMemo } from 'react'
import { getIsLocal } from '../utils/trainTypeString'
import useCurrentTrainType from './useCurrentTrainType'
import useNextTrainType from './useNextTrainType'

const useNextOperatorTrainTypeIsDifferent = (): boolean => {
  const trainType = useCurrentTrainType()
  const nextTrainType = useNextTrainType()

  const nextTrainTypeIsDifferent = useMemo(() => {
    if (!trainType) {
      return false
    }

    if (!nextTrainType) {
      return false
    }

    if (getIsLocal(trainType) && getIsLocal(nextTrainType)) {
      return false
    }

    return trainType?.typeId !== nextTrainType?.typeId
  }, [nextTrainType, trainType])

  return nextTrainTypeIsDifferent
}

export default useNextOperatorTrainTypeIsDifferent
