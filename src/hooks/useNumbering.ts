import { useEffect, useMemo, useState } from 'react'
import { useRecoilValue } from 'recoil'
import { MarkShape } from '../constants/numbering'
import { StationNumber } from '../models/StationAPI'
import stationState from '../store/atoms/station'
import getIsPass from '../utils/isPass'
import useCurrentStation from './useCurrentStation'
import useGetLineMark from './useGetLineMark'
import useNextStation from './useNextStation'
import useStationNumberIndexFunc from './useStationNumberIndexFunc'

const useNumbering = (
  priorCurrent?: boolean
): [
  StationNumber | undefined,
  string | undefined,
  MarkShape | null | undefined
] => {
  const { arrived, selectedBound } = useRecoilValue(stationState)

  const [stationNumber, setStationNumber] = useState<StationNumber>()
  const [threeLetterCode, setThreeLetterCode] = useState<string>()

  const nextStation = useNextStation()
  const currentStation = useCurrentStation()
  const stoppedCurrentStation = useCurrentStation({ skipPassStation: true })

  const getStationNumberIndex = useStationNumberIndexFunc()

  const currentStationNumberIndex = useMemo(
    () => getStationNumberIndex(stoppedCurrentStation?.stationNumbers ?? []),
    [stoppedCurrentStation?.stationNumbers, getStationNumberIndex]
  )
  const nextStationNumberIndex = useMemo(
    () => getStationNumberIndex(nextStation?.stationNumbers ?? []),
    [nextStation?.stationNumbers, getStationNumberIndex]
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
        stoppedCurrentStation?.stationNumbers?.[currentStationNumberIndex]
      )
      setThreeLetterCode(stoppedCurrentStation?.threeLetterCode)
      return
    }

    // 到着していて、かつ停車駅でない場合は、次の駅の番号を表示する
    // 到着していない場合は無条件で次の駅の番号を表示する
    if ((arrived && getIsPass(currentStation)) || !arrived) {
      setStationNumber(nextStation?.stationNumbers?.[nextStationNumberIndex])
      setThreeLetterCode(nextStation?.threeLetterCode)
      return
    }
    setStationNumber(
      stoppedCurrentStation?.stationNumbers?.[currentStationNumberIndex]
    )
    setThreeLetterCode(stoppedCurrentStation?.threeLetterCode)
  }, [
    arrived,
    currentStation,
    currentStationNumberIndex,
    nextStation?.stationNumbers,
    nextStation?.threeLetterCode,
    nextStationNumberIndex,
    priorCurrent,
    selectedBound,
    stoppedCurrentStation,
  ])

  const getLineMarkFunc = useGetLineMark()

  const lineMarkShape = useMemo(() => {
    const currentStationLineMark =
      stoppedCurrentStation &&
      getLineMarkFunc({
        station: stoppedCurrentStation,
        line: stoppedCurrentStation.currentLine,
        numberingIndex: currentStationNumberIndex,
      })
    const nextStationLineMark =
      nextStation &&
      getLineMarkFunc({
        station: nextStation,
        line: nextStation.currentLine,
        numberingIndex: nextStationNumberIndex,
      })

    if (
      priorCurrent &&
      stoppedCurrentStation &&
      !getIsPass(stoppedCurrentStation)
    ) {
      return currentStationLineMark?.signShape
    }

    if (arrived && stoppedCurrentStation) {
      return getIsPass(stoppedCurrentStation)
        ? nextStationLineMark?.currentLineMark?.signShape
        : currentStationLineMark?.currentLineMark?.signShape
    }
    return nextStationLineMark?.currentLineMark?.signShape
  }, [
    arrived,
    currentStationNumberIndex,
    getLineMarkFunc,
    nextStation,
    nextStationNumberIndex,
    priorCurrent,
    stoppedCurrentStation,
  ])

  return [stationNumber, threeLetterCode, lineMarkShape]
}

export default useNumbering
