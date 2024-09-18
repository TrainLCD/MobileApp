import { useEffect, useMemo, useState } from 'react'
import { useRecoilValue } from 'recoil'
import {
  IS_LIVE_ACTIVITIES_ELIGIBLE_PLATFORM,
  parenthesisRegexp,
} from '../constants'
import { directionToDirectionName } from '../models/Bound'
import stationState from '../store/atoms/station'
import { isJapanese } from '../translation'
import getIsPass from '../utils/isPass'
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
import useIsPassing from './useIsPassing'
import { useLoopLine } from './useLoopLine'
import { useNextStation } from './useNextStation'
import usePreviousStation from './usePreviousStation'
import useStationNumberIndexFunc from './useStationNumberIndexFunc'

export const useUpdateLiveActivities = (): void => {
  const [started, setStarted] = useState(false)
  const { arrived, selectedBound, selectedDirection, approaching } =
    useRecoilValue(stationState)

  const previousStation = usePreviousStation()
  const currentLine = useCurrentLine()
  const currentStation = useCurrentStation()
  const stoppedCurrentStation = useCurrentStation(true)
  const nextStation = useNextStation()
  const { directionalStops } = useBounds()
  const isNextLastStop = useIsNextLastStop()
  const getStationNumberIndex = useStationNumberIndexFunc()
  const trainType = useCurrentTrainType()
  const { isLoopLine, isPartiallyLoopLine, isYamanoteLine, isOsakaLoopLine } =
    useLoopLine()
  const isPassing = useIsPassing()

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

  const activityState = useMemo(() => {
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
      isLoopLine: isLoopLine || isPartiallyLoopLine,
      isNextLastStop,
      lineColor: currentLine?.color ?? '#000000',
      lineName:
        (isJapanese ? currentLine?.nameShort : currentLine?.nameRoman) ?? '',
    }
  }, [
    approaching,
    arrived,
    boundStationName,
    boundStationNumber,
    currentLine?.color,
    currentLine?.nameRoman,
    currentLine?.nameShort,
    currentStation,
    getStationNumberIndex,
    isLoopLine,
    isNextLastStop,
    isPartiallyLoopLine,
    isPassing,
    nextStation,
    previousStation,
    stoppedCurrentStation,
    trainTypeName,
  ])

  useEffect(() => {
    if (!IS_LIVE_ACTIVITIES_ELIGIBLE_PLATFORM) {
      return
    }

    if (!selectedBound) {
      stopLiveActivity()
      setStarted(false)
      return
    }

    if (selectedBound && !started && activityState) {
      startLiveActivity(activityState)
      setStarted(true)
    }

    updateLiveActivity(activityState)
  }, [activityState, selectedBound, started])
}
