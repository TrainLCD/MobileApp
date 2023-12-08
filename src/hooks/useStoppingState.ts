import { useMemo, useRef } from 'react'
import { useRecoilValue } from 'recoil'
import { HeaderStoppingState } from '../models/HeaderTransitionState'
import stationState from '../store/atoms/station'
import getIsPass from '../utils/isPass'
import useCurrentStation from './useCurrentStation'
import { useNextStation } from './useNextStation'

export const useStoppingState = (): HeaderStoppingState => {
  const { arrived, approaching } = useRecoilValue(stationState)
  const currentStation = useCurrentStation()
  const nextStation = useNextStation()
  // NOTE: 最初にCURRENT以外のステートを返さないようにする
  const isFirstMainStateRef = useRef(true)

  const currentStateKey = useMemo(() => {
    if (isFirstMainStateRef.current && !arrived) {
      isFirstMainStateRef.current = false
      return 'CURRENT'
    }

    if ((arrived && !getIsPass(currentStation)) || !nextStation) {
      return 'CURRENT'
    }

    // 次に通る駅が通過駅である場合、通過駅に対して「まもなく」と表示されないようにする
    if (approaching && !arrived && !getIsPass(nextStation)) {
      return 'ARRIVING'
    }
    return 'NEXT'
  }, [approaching, arrived, currentStation, nextStation])

  return currentStateKey
}
