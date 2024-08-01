import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { Line } from '../../gen/proto/stationapi_pb'
import stationState from '../store/atoms/station'
import { currentStationSelector } from '../store/selectors/currentStation'
import getIsPass from '../utils/isPass'
import { useNextStation } from './useNextStation'
import useTransferLinesFromStation from './useTransferLinesFromStation'

type Option = { omitRepeatingLine?: boolean; omitJR?: boolean }

const useTransferLines = (options?: Option): Line[] => {
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

  const { omitRepeatingLine, omitJR } = options ?? {
    omitRepeatingLines: false,
    omitJR: false,
  }

  const transferLines = useTransferLinesFromStation(targetStation, {
    omitRepeatingLine,
    omitJR,
  })

  return transferLines
}

export default useTransferLines
