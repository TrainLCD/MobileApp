import { useEffect, useMemo, useState } from 'react'
import { useRecoilValue } from 'recoil'
import {
  IS_LIVE_ACTIVITIES_ELIGIBLE_PLATFORM,
  parenthesisRegexp,
} from '../constants'
import { directionToDirectionName } from '../models/Bound'
import stationState from '../store/atoms/station'
import { currentStationSelector } from '../store/selectors/currentStation'
import { isJapanese } from '../translation'
import getIsPass from '../utils/isPass'
import {
  startLiveActivity,
  stopLiveActivity,
  updateLiveActivity,
} from '../utils/native/ios/liveActivityModule'
import useCurrentTrainType from './useCurrentTrainType'
import useIsNextLastStop from './useIsNextLastStop'
import { useLoopLine } from './useLoopLine'
import useLoopLineBound from './useLoopLineBound'
import { useNextStation } from './useNextStation'
import usePreviousStation from './usePreviousStation'
import useStationNumberIndexFunc from './useStationNumberIndexFunc'

export const useUpdateLiveActivities = (): void => {
  const [started, setStarted] = useState(false)
  const { arrived, selectedBound, selectedDirection, approaching } =
    useRecoilValue(stationState)

  const previousStation = usePreviousStation()
  const currentStation = useRecoilValue(currentStationSelector({}))
  const stoppedCurrentStation = useRecoilValue(
    currentStationSelector({ skipPassStation: true })
  )
  const nextStation = useNextStation()
  const loopLineBound = useLoopLineBound(false)
  const isNextLastStop = useIsNextLastStop()
  const getStationNumberIndex = useStationNumberIndexFunc()
  const trainType = useCurrentTrainType()
  const { isLoopLine, isYamanoteLine, isOsakaLoopLine } = useLoopLine()

  const trainTypeName = useMemo(() => {
    // 山手線か大阪環状線の直通がない種別が選択されていて、日本語環境でもない場合
    // 英語だとInbound/Outboundとなり本質と違うので空の文字列を渡して表示しないようにしている
    // 名古屋市営地下鉄名城線は主要行き先を登録していないので、Clockwise/Counterclockwiseのままにしている
    if ((isYamanoteLine || isOsakaLoopLine) && !isJapanese) {
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
    currentStation?.line,
    isLoopLine,
    isOsakaLoopLine,
    isYamanoteLine,
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
          const stationIndex = getStationNumberIndex(s)
          return s?.stationNumbers?.[stationIndex]?.stationNumber
        })
        .join('/')
    }
    const boundStationIndex = getStationNumberIndex(selectedBound ?? undefined)
    return (
      selectedBound?.stationNumbers?.[boundStationIndex]?.stationNumber ?? ''
    )
  }, [
    getStationNumberIndex,
    isLoopLine,
    loopLineBound?.stations,
    selectedBound,
  ])

  const activityState = useMemo(() => {
    const isPassing = currentStation && getIsPass(currentStation) && arrived

    const stoppedStation = stoppedCurrentStation ?? previousStation
    const passingStationName =
      (isJapanese ? currentStation?.name : currentStation?.nameRoman) ?? ''

    const stoppedStationNumberingIndex = getStationNumberIndex(stoppedStation)
    const currentStationNumberingIndex = getStationNumberIndex(
      currentStation ?? undefined
    )
    const nextStationNumberingIndex = getStationNumberIndex(nextStation)

    return {
      stationName: isJapanese
        ? stoppedStation?.name ?? ''
        : stoppedStation?.nameRoman ?? '',
      nextStationName: isJapanese
        ? nextStation?.name ?? ''
        : nextStation?.nameRoman ?? '',
      stationNumber:
        stoppedStation?.stationNumbers?.[stoppedStationNumberingIndex]
          ?.stationNumber ?? '',
      nextStationNumber:
        nextStation?.stationNumbers?.[nextStationNumberingIndex]
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
        ? currentStation?.stationNumbers[currentStationNumberingIndex]
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
    if (!IS_LIVE_ACTIVITIES_ELIGIBLE_PLATFORM) {
      return
    }
    if (selectedBound && !started && activityState) {
      startLiveActivity(activityState)
      setStarted(true)
    }
  }, [activityState, selectedBound, started])

  useEffect(() => {
    if (!IS_LIVE_ACTIVITIES_ELIGIBLE_PLATFORM) {
      return
    }
    if (!selectedBound) {
      stopLiveActivity()
      setStarted(false)
    }
  }, [selectedBound])

  useEffect(() => {
    if (!IS_LIVE_ACTIVITIES_ELIGIBLE_PLATFORM) {
      return
    }
    updateLiveActivity(activityState)
  }, [activityState])
}
