import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import stationState from '../store/atoms/station'
import getIsPass from '../utils/isPass'
import useCurrentStation from './useCurrentStation'
import useNextStation from './useNextStation'

const useCurrentStateKey = (): 'CURRENT' | 'ARRIVING' | 'NEXT' => {
  const { arrived, approaching } = useRecoilValue(stationState)
  const currentStation = useCurrentStation()
  const actualNextStation = useNextStation(false)

  const currentStateKey = useMemo(() => {
    if (arrived && currentStation && !getIsPass(currentStation)) {
      return 'CURRENT'
    }
    // 次に通る駅が通過駅である場合、通過駅に対して「まもなく」と表示されないようにする
    if (approaching && actualNextStation && !getIsPass(actualNextStation)) {
      return 'ARRIVING'
    }
    return 'NEXT'
  }, [actualNextStation, approaching, arrived, currentStation])

  return currentStateKey
}

export default useCurrentStateKey
