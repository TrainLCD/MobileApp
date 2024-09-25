import { useEffect, useMemo, useState } from 'react'
import { useRecoilValue } from 'recoil'
import {
  IS_LIVE_ACTIVITIES_ELIGIBLE_PLATFORM,
  parenthesisRegexp,
} from '../constants'
import { directionToDirectionName } from '../models/Bound'
import stationState from '../store/atoms/station'
import { isJapanese } from '../translation'
import { getIsPassFromStopCondition } from '../utils/isPass'
import {
  startLiveActivity,
  stopLiveActivity,
  updateLiveActivity,
} from '../utils/native/ios/liveActivityModule'
import useBounds from './useBounds'
import { useCurrentLine } from './useCurrentLine'
import { useCurrentStation } from './useCurrentStation'
import useCurrentTrainType from './useCurrentTrainType'
import useIsNextLastStop from './useIsNextLastStop'
import { useLoopLine } from './useLoopLine'
import { useNextStation } from './useNextStation'
import useStationNumberIndexFunc from './useStationNumberIndexFunc'

export const useUpdateLiveActivities = (): void => {
  const [started, setStarted] = useState(false)
  const { arrived, selectedBound, selectedDirection, approaching } =
    useRecoilValue(stationState)

  const currentLine = useCurrentLine()
  const previousStation = useCurrentStation(true)
  const currentStation = useCurrentStation()
  const nextStation = useNextStation()
  const { directionalStops } = useBounds()
  const isNextLastStop = useIsNextLastStop()
  const getStationNumberIndex = useStationNumberIndexFunc()
  const trainType = useCurrentTrainType()
  const { isLoopLine, isPartiallyLoopLine, isYamanoteLine, isOsakaLoopLine } =
    useLoopLine()

  const currentStationStopCond = useMemo(
    () => currentStation?.stopCondition,
    [currentStation?.stopCondition]
  )
  const nextStationStopCond = useMemo(
    () => nextStation?.stopCondition,
    [nextStation?.stopCondition]
  )

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
    const jaSuffix = isLoopLine || isPartiallyLoopLine ? '方面' : ''

    return `${directionalStops
      .map((s) => (isJapanese ? s.name : s.nameRoman))
      .join(isJapanese ? '・' : '/')}${isJapanese ? jaSuffix : ''}`
  }, [directionalStops, isLoopLine, isPartiallyLoopLine])

  const boundStationNumber = useMemo(() => {
    return directionalStops
      .map((s) => {
        const stationIndex = getStationNumberIndex(s)
        return s?.stationNumbers?.[stationIndex]?.stationNumber
      })
      .join('/')
  }, [directionalStops, getStationNumberIndex])

  const stoppedStation = useMemo(
    () => previousStation ?? currentStation,
    [currentStation, previousStation]
  )
  const stationName = useMemo(
    () => (isJapanese ? stoppedStation?.name : stoppedStation?.nameRoman) ?? '',
    [stoppedStation?.name, stoppedStation?.nameRoman]
  )

  const nextStationName = useMemo(
    () =>
      arrived && !getIsPassFromStopCondition(currentStationStopCond)
        ? ''
        : (isJapanese ? nextStation?.name : nextStation?.nameRoman) ?? '',
    [arrived, currentStationStopCond, nextStation?.name, nextStation?.nameRoman]
  )

  const stoppedStationNumber = useMemo(() => {
    const stoppedStationNumberingIndex = getStationNumberIndex(
      stoppedStation ?? null
    )
    return (
      stoppedStation?.stationNumbers?.[stoppedStationNumberingIndex]
        ?.stationNumber ?? ''
    )
  }, [getStationNumberIndex, stoppedStation])

  const nextStationNumber = useMemo(() => {
    if (arrived && !getIsPassFromStopCondition(currentStationStopCond)) {
      return ''
    }

    const nextStationNumberingIndex = getStationNumberIndex(nextStation ?? null)
    return (
      nextStation?.stationNumbers?.[nextStationNumberingIndex]?.stationNumber ??
      ''
    )
  }, [arrived, currentStationStopCond, getStationNumberIndex, nextStation])

  const isApproachingForLA = useMemo(
    () =>
      !!(
        approaching &&
        !arrived &&
        !getIsPassFromStopCondition(nextStationStopCond)
      ),
    [approaching, arrived, nextStationStopCond]
  )
  const isStoppedForLA = useMemo(
    () => !!(arrived && !getIsPassFromStopCondition(currentStationStopCond)),
    [arrived, currentStationStopCond]
  )

  const lineColor = useMemo(
    () => currentLine?.color ?? '#000000',
    [currentLine?.color]
  )
  const lineName = useMemo(
    () => (isJapanese ? currentLine?.nameShort : currentLine?.nameRoman) ?? '',
    [currentLine?.nameRoman, currentLine?.nameShort]
  )

  const activityState = useMemo(
    () => ({
      stationName,
      nextStationName,
      stationNumber: stoppedStationNumber,
      nextStationNumber: nextStationNumber,
      approaching: isApproachingForLA,
      stopped: isStoppedForLA,
      boundStationName,
      boundStationNumber,
      trainTypeName,
      isLoopLine: isLoopLine || isPartiallyLoopLine,
      isNextLastStop,
      lineColor,
      lineName,
    }),
    [
      boundStationName,
      boundStationNumber,
      isApproachingForLA,
      isLoopLine,
      isNextLastStop,
      isPartiallyLoopLine,
      isStoppedForLA,
      lineColor,
      lineName,
      nextStationName,
      nextStationNumber,
      stationName,
      stoppedStationNumber,
      trainTypeName,
    ]
  )

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
