import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { Line } from '../models/StationAPI'
import stationState from '../store/atoms/station'
import getIsPass from '../utils/isPass'
import useCurrentStation from './useCurrentStation'
import useNextStation from './useNextStation'
import useTransferLinesFromStation from './useTransferLinesFromStation'

const useTransferLines = (): Line[] => {
  const { arrived } = useRecoilValue(stationState)
  const currentStation = useCurrentStation()
  const nextStation = useNextStation()
  const targetStation = useMemo(
    () =>
      arrived && currentStation && !getIsPass(currentStation)
        ? currentStation
        : nextStation ?? null,
    [arrived, currentStation, nextStation]
  )

  const transferLines = useTransferLinesFromStation(targetStation)

  return transferLines
}

export default useTransferLines
