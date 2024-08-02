import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import stationState from '../store/atoms/station'
import getIsPass from '../utils/isPass'
import { useCurrentStation } from './useCurrentStation'
import { useNextStation } from './useNextStation'

const useIsPassing = (): boolean => {
  const { arrived } = useRecoilValue(stationState)
  const currentStation = useCurrentStation()
  const nextStation = useNextStation()

  const passing = useMemo(() => {
    if (!nextStation) {
      return false
    }
    return !!(currentStation && getIsPass(currentStation) && arrived)
  }, [arrived, currentStation, nextStation])

  return passing
}

export default useIsPassing
