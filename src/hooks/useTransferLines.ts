import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { LineResponse } from '../gen/stationapi_pb'
import stationState from '../store/atoms/station'
import getIsPass from '../utils/isPass'
import useCurrentStation from './useCurrentStation'
import useNextStation from './useNextStation'
import useTransferLinesFromStation from './useTransferLinesFromStation'

const useTransferLines = (): LineResponse.AsObject[] => {
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
