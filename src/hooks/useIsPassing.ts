import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import stationState from '../store/atoms/station'
import { currentStationSelector } from '../store/selectors/currentStation'
import getIsPass from '../utils/isPass'
import { useNextStation } from './useNextStation'

const useIsPassing = (): boolean => {
  const { arrived } = useRecoilValue(stationState)
  const currentStation = useRecoilValue(currentStationSelector({}))
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
