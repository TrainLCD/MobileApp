import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { Line } from '../gen/stationapi_pb'
import stationState from '../store/atoms/station'
import { currentStationSelector } from '../store/selectors/currentStation'
import getIsPass from '../utils/isPass'
import { useNextStation } from './useNextStation'
import useTransferLinesFromStation from './useTransferLinesFromStation'

const useTransferLines = (): Line.AsObject[] => {
  const { arrived } = useRecoilValue(stationState)
  const currentStation = useRecoilValue(
    currentStationSelector({
      withTrainTypes: true,
    })
  )
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
