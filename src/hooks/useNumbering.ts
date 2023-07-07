import { useEffect, useMemo, useState } from 'react'
import { useRecoilValue } from 'recoil'
import { StationNumber } from '../gen/stationapi_pb'
import stationState from '../store/atoms/station'
import getIsPass from '../utils/isPass'
import useCurrentStation from './useCurrentStation'
import useNextStation from './useNextStation'
import useStationNumberIndexFunc from './useStationNumberIndexFunc'

const useNumbering = (
  priorCurrent?: boolean
): [StationNumber.AsObject | undefined, string | undefined] => {
  const { arrived, selectedBound } = useRecoilValue(stationState)

  const [stationNumber, setStationNumber] = useState<StationNumber.AsObject>()
  const [threeLetterCode, setThreeLetterCode] = useState<string>()

  const nextStation = useNextStation()
  const currentStation = useCurrentStation()
  const stoppedCurrentStation = useCurrentStation({ skipPassStation: true })

  const getStationNumberIndex = useStationNumberIndexFunc()

  const currentStationNumberIndex = useMemo(
    () =>
      getStationNumberIndex(stoppedCurrentStation?.stationNumbersList ?? []),
    [stoppedCurrentStation?.stationNumbersList, getStationNumberIndex]
  )
  const nextStationNumberIndex = useMemo(
    () => getStationNumberIndex(nextStation?.stationNumbersList ?? []),
    [nextStation?.stationNumbersList, getStationNumberIndex]
  )

  useEffect(() => {
    if (!selectedBound) {
      setStationNumber(undefined)
      setThreeLetterCode(undefined)
    }
  }, [selectedBound])

  useEffect(() => {
    if (!stoppedCurrentStation) {
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
    if ((arrived && getIsPass(currentStation)) || !arrived) {
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
    stoppedCurrentStation,
  ])

  return [stationNumber, threeLetterCode]
}

export default useNumbering
