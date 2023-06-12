import { useEffect, useMemo, useState } from 'react'
import { useRecoilValue } from 'recoil'
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
  string | null | undefined
] => {
  const { arrived, selectedBound } = useRecoilValue(stationState)

  const [stationNumber, setStationNumber] = useState<StationNumber>()
  const [threeLetterCode, setThreeLetterCode] = useState<string>()

  const nextStation = useNextStation()
  const currentStation = useCurrentStation({ withTrainTypes: true })

  const getStationNumberIndex = useStationNumberIndexFunc()

  const currentStationNumberIndex = useMemo(
    () => getStationNumberIndex(currentStation?.stationNumbersList ?? []),
    [currentStation?.stationNumbersList, getStationNumberIndex]
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
    if (!selectedBound || !currentStation) {
      return
    }
    if (priorCurrent && !getIsPass(currentStation)) {
      setStationNumber(
        currentStation?.stationNumbersList?.[currentStationNumberIndex]
      )
      setThreeLetterCode(currentStation?.threeLetterCode)
      return
    }
    if (arrived) {
      setStationNumber(
        getIsPass(currentStation)
          ? nextStation?.stationNumbersList?.[nextStationNumberIndex]
          : currentStation?.stationNumbersList?.[currentStationNumberIndex]
      )
      setThreeLetterCode(
        getIsPass(currentStation)
          ? nextStation?.threeLetterCode
          : currentStation?.threeLetterCode
      )
      return
    }
    setStationNumber(nextStation?.stationNumbersList?.[nextStationNumberIndex])
    setThreeLetterCode(nextStation?.threeLetterCode)
  }, [
    arrived,
    currentStation,
    currentStationNumberIndex,
    nextStation?.stationNumbersList,
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
        line: currentStation.line,
        numberingIndex: currentStationNumberIndex,
      })
    const nextStationLineMark =
      nextStation &&
      getLineMarkFunc({
        station: nextStation,
        line: nextStation.line,
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
