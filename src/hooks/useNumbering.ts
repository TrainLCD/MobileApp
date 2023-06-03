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

  const getStationNumberIndex = useStationNumberIndexFunc()

  const currentStationNumberIndex = useMemo(
    () => getStationNumberIndex(currentStation?.stationNumbers ?? []),
    [currentStation?.stationNumbers, getStationNumberIndex]
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
    if (!selectedBound || !currentStation) {
      return
    }
    if (priorCurrent && !getIsPass(currentStation)) {
      setStationNumber(
        currentStation?.stationNumbers?.[currentStationNumberIndex]
      )
      setThreeLetterCode(currentStation?.threeLetterCode)
      return
    }
    if (arrived) {
      setStationNumber(
        getIsPass(currentStation)
          ? nextStation?.stationNumbers?.[nextStationNumberIndex]
          : currentStation?.stationNumbers?.[currentStationNumberIndex]
      )
      setThreeLetterCode(
        getIsPass(currentStation)
          ? nextStation?.threeLetterCode
          : currentStation?.threeLetterCode
      )
      return
    }
    setStationNumber(nextStation?.stationNumbers?.[nextStationNumberIndex])
    setThreeLetterCode(nextStation?.threeLetterCode)
  }, [
    arrived,
    currentStation,
    currentStationNumberIndex,
    nextStation?.stationNumbers,
    nextStation?.threeLetterCode,
    nextStationNumberIndex,
    priorCurrent,
    selectedBound,
  ])

  const getLineMarkFunc = useGetLineMark()

  const lineMarkShape = useMemo(() => {
    const currentStationLineMark =
      currentStation &&
      getLineMarkFunc({
        station: currentStation,
        line: currentStation.currentLine,
        numberingIndex: currentStationNumberIndex,
      })
    const nextStationLineMark =
      nextStation &&
      getLineMarkFunc({
        station: nextStation,
        line: nextStation.currentLine,
        numberingIndex: nextStationNumberIndex,
      })

    if (priorCurrent && currentStation && !getIsPass(currentStation)) {
      return currentStationLineMark?.signShape
    }

    if (arrived && currentStation) {
      return getIsPass(currentStation)
        ? nextStationLineMark?.currentLineMark?.signShape
        : currentStationLineMark?.currentLineMark?.signShape
    }
    return nextStationLineMark?.currentLineMark?.signShape
  }, [
    arrived,
    currentStation,
    currentStationNumberIndex,
    getLineMarkFunc,
    nextStation,
    nextStationNumberIndex,
    priorCurrent,
  ])

  return [stationNumber, threeLetterCode, lineMarkShape]
}

export default useNumbering
