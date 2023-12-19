import { useEffect, useMemo, useState } from 'react'
import { useRecoilValue } from 'recoil'
import { StationNumber } from '../../gen/stationapi_pb'
import stationState from '../../store/atoms/station'
import { currentStationSelector } from '../../store/selectors/currentStation'
import getIsPass from '../../utils/isPass'
import { useNextStation } from '../useNextStation'
import useStationNumberIndexFunc from '../useStationNumberIndexFunc'

export const useNumbering = (
  priorCurrent?: boolean
): [StationNumber.AsObject | undefined, string | undefined] => {
  const { arrived, selectedBound } = useRecoilValue(stationState)
  const stoppedCurrentStation = useRecoilValue(
    currentStationSelector({ skipPassStation: true })
  )

  const [stationNumber, setStationNumber] = useState<StationNumber.AsObject>()
  const [threeLetterCode, setThreeLetterCode] = useState<string>()

  const nextStation = useNextStation()
  const currentStation = useRecoilValue(currentStationSelector({}))

  const getStationNumberIndex = useStationNumberIndexFunc()

  const currentStationNumberIndex = useMemo(
    () => getStationNumberIndex(stoppedCurrentStation ?? undefined),
    [getStationNumberIndex, stoppedCurrentStation]
  )
  const nextStationNumberIndex = useMemo(
    () => getStationNumberIndex(nextStation),
    [getStationNumberIndex, nextStation]
  )

  useEffect(() => {
    if (!selectedBound) {
      setStationNumber(undefined)
      setThreeLetterCode(undefined)
    }
  }, [selectedBound])

  useEffect(() => {
    if (!selectedBound || !stoppedCurrentStation) {
      return
    }
    if (priorCurrent && !getIsPass(stoppedCurrentStation)) {
      setStationNumber(
        stoppedCurrentStation?.stationNumbersList?.[currentStationNumberIndex]
      )
      setThreeLetterCode(stoppedCurrentStation?.threeLetterCode)
      return
    }

    // 到着していて、かつ停車駅でない場合は、次の駅の番号を表示する
    // 到着していない場合は無条件で次の駅の番号を表示する
    if (
      (arrived && getIsPass(currentStation)) ||
      !arrived ||
      priorCurrent === false // priorCurrentを特に指定していない時にデグレしないようにした
    ) {
      setStationNumber(
        nextStation?.stationNumbersList?.[nextStationNumberIndex]
      )
      setThreeLetterCode(nextStation?.threeLetterCode)
      return
    }
    setStationNumber(
      stoppedCurrentStation?.stationNumbersList?.[currentStationNumberIndex]
    )
    setThreeLetterCode(stoppedCurrentStation?.threeLetterCode)
  }, [
    arrived,
    currentStation,
    currentStationNumberIndex,
    nextStation?.stationNumbersList,
    nextStation?.threeLetterCode,
    nextStationNumberIndex,
    priorCurrent,
    selectedBound,
    stoppedCurrentStation,
  ])

  return [stationNumber, threeLetterCode]
}
