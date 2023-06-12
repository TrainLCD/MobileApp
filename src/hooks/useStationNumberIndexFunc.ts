import { useCallback } from 'react'
import { StationNumber } from '../models/StationAPI'
import { getIsLocal } from '../utils/localType'
import useCurrentTrainType from './useCurrentTrainType'

const useStationNumberIndexFunc = (): ((
  stationNumbers: StationNumber[]
) => 0 | 1) => {
  const trainType = useCurrentTrainType()

  // 種別が各駅停車もしくは種別設定なしの場合は0番目のstationNumberを使う
  // 各停以外かつ2つ以上のstationNumberが設定されていれば1番目のstationNumberを使う
  // TODO: ↑の仕様をどこかに書く
  const func = useCallback(
    (stationNumbers: StationNumber[]) => {
      const isLocal = trainType && getIsLocal(trainType)
      if (!trainType || isLocal) {
        return 0
      }
      if (!isLocal && (stationNumbers.length ?? 0) > 1) {
        return 1
      }
      return 0
    },
    [trainType]
  )

  return func
}

export default useStationNumberIndexFunc
