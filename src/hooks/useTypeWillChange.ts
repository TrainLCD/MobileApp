import { useMemo } from 'react'
import { getIsLocal } from '../utils/trainTypeString'
import useCurrentTrainType from './useCurrentTrainType'
import useNextTrainType from './useNextTrainType'

export const useTypeWillChange = (): boolean => {
  const trainType = useCurrentTrainType()
  const nextTrainType = useNextTrainType()

  const nextTrainTypeIsDifferent = useMemo(() => {
    if (!trainType || !nextTrainType) {
      return false
    }

    if (getIsLocal(trainType) && getIsLocal(nextTrainType)) {
      return false
    }

    // 小田急の路線同一で途中種別が変わる対応
    if (
      trainType.line?.id === nextTrainType.line?.id &&
      trainType.line?.company?.id === nextTrainType.line?.company?.id
    ) {
      return true
    }

    return trainType?.typeId !== nextTrainType?.typeId
  }, [nextTrainType, trainType])

  return nextTrainTypeIsDifferent
}
