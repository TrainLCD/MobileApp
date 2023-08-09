import { useEffect, useMemo, useState } from 'react'
import { useRecoilValue } from 'recoil'
import { parenthesisRegexp } from '../constants/regexp'
import { directionToDirectionName } from '../models/Bound'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import { isJapanese } from '../translation'
import getIsPass from '../utils/isPass'
import {
  getIsLoopLine,
  getIsOsakaLoopLine,
  getIsYamanoteLine,
} from '../utils/loopLine'
import {
  startLiveActivity,
  stopLiveActivity,
  updateLiveActivity,
} from '../utils/native/ios/liveActivityModule'
import useCurrentLine from './useCurrentLine'
import useCurrentStation from './useCurrentStation'
import useIsNextLastStop from './useIsNextLastStop'
import useLoopLineBound from './useLoopLineBound'
import useNextStation from './useNextStation'
import usePreviousStation from './usePreviousStation'
import useStationNumberIndexFunc from './useStationNumberIndexFunc'

const useUpdateLiveActivities = (): void => {
  const [started, setStarted] = useState(false)
  const { arrived, selectedBound, selectedDirection, approaching } =
    useRecoilValue(stationState)
  const { trainType } = useRecoilValue(navigationState)

  const previousStation = usePreviousStation()
  const currentStation = useCurrentStation()
  const stoppedCurrentStation = useCurrentStation({ skipPassStation: true })
  const nextStation = useNextStation()
  const loopLineBound = useLoopLineBound(false)
  const currentLine = useCurrentLine()
  const isNextLastStop = useIsNextLastStop()
  const getStationNumberIndex = useStationNumberIndexFunc()

  const isLoopLine = useMemo(
    () => getIsLoopLine(currentStation?.line, trainType),
    [currentStation?.line, trainType]
  )

  const trainTypeName = useMemo(() => {
    // 山手線か大阪環状線の直通がない種別が選択されていて、日本語環境でもない場合
    // 英語だとInbound/Outboundとなり本質と違うので空の文字列を渡して表示しないようにしている
    // 名古屋市営地下鉄名城線は主要行き先を登録していないので、Clockwise/Counterclockwiseのままにしている
    if (
      currentLine &&
      (getIsYamanoteLine(currentLine.id) ||
        getIsOsakaLoopLine(currentLine.id)) &&
      // !trainType &&
      !isJapanese
    ) {
      return ''
    }
    if (selectedDirection && isLoopLine) {
      return directionToDirectionName(currentStation?.line, selectedDirection)
    }
    if (isJapanese) {
      return (trainType?.name ?? '各駅停車')
        .replace(parenthesisRegexp, '')
        .replace(/\n/, '')
    }
    return (trainType?.nameRoman ?? 'Local')
      .replace(parenthesisRegexp, '')
      .replace(/\n/, '')
  }, [
    currentLine,
    currentStation?.line,
    isLoopLine,
    selectedDirection,
    trainType?.name,
    trainType?.nameRoman,
  ])

  const boundStationName = useMemo(() => {
    if (isLoopLine) {
      return loopLineBound?.boundFor
    }
    if (isJapanese) {
      return selectedBound?.name ?? ''
    }
    return selectedBound?.nameRoman ?? ''
  }, [isLoopLine, loopLineBound, selectedBound?.name, selectedBound?.nameRoman])

  const boundStationNumber = useMemo(() => {
    if (isLoopLine) {
      return loopLineBound?.stations
        .map((s) => {
          const stationIndex = getStationNumberIndex(s?.line)
          return s?.stationNumbersList[stationIndex]?.stationNumber
        })
        .join('/')
    }
    const boundStationIndex = getStationNumberIndex(selectedBound?.line)
    return (
      selectedBound?.stationNumbersList[boundStationIndex]?.stationNumber ?? ''
    )
  }, [
    getStationNumberIndex,
    isLoopLine,
    loopLineBound?.stations,
    selectedBound?.line,
    selectedBound?.stationNumbersList,
  ])

  const activityState = useMemo(() => {
    const isPassing = currentStation && getIsPass(currentStation) && arrived

    const stoppedStation = stoppedCurrentStation ?? previousStation
    const passingStationName =
      (isJapanese ? currentStation?.name : currentStation?.nameRoman) ?? ''

    const stoppedStationNumberingIndex = getStationNumberIndex(
      stoppedStation?.line
    )
    const currentStationNumberingIndex = getStationNumberIndex(
      currentStation?.line
    )
    const nextStationNumberingIndex = getStationNumberIndex(nextStation?.line)

    return {
      stationName: isJapanese
        ? stoppedStation?.name ?? ''
        : stoppedStation?.nameRoman ?? '',
      nextStationName: isJapanese
        ? nextStation?.name ?? ''
        : nextStation?.nameRoman ?? '',
      stationNumber:
        stoppedStation?.stationNumbersList[stoppedStationNumberingIndex]
          ?.stationNumber ?? '',
      nextStationNumber:
        nextStation?.stationNumbersList[nextStationNumberingIndex]
          ?.stationNumber ?? '',
      approaching: !!(
        approaching &&
        !arrived &&
        !getIsPass(nextStation ?? null)
      ),
      stopping: !!(arrived && currentStation && !getIsPass(currentStation)),
      boundStationName,
      boundStationNumber,
      trainTypeName,
      passingStationName: isPassing ? passingStationName : '',
      passingStationNumber: isPassing
        ? currentStation?.stationNumbersList[currentStationNumberingIndex]
            ?.stationNumber ?? ''
        : '',
      isLoopLine,
      isNextLastStop,
    }
  }, [
    approaching,
    arrived,
    boundStationName,
    boundStationNumber,
    currentStation,
    getStationNumberIndex,
    isLoopLine,
    isNextLastStop,
    nextStation,
    previousStation,
    stoppedCurrentStation,
    trainTypeName,
  ])

  useEffect(() => {
    if (selectedBound && !started && activityState) {
      startLiveActivity(activityState)
      setStarted(true)
    }
  }, [activityState, selectedBound, started])

  useEffect(() => {
    if (!selectedBound) {
      stopLiveActivity()
      setStarted(false)
    }
  }, [selectedBound])

  useEffect(() => {
    updateLiveActivity(activityState)
  }, [activityState])
}

export default useUpdateLiveActivities
