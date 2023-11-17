import * as Notifications from 'expo-notifications'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import { Station } from '../gen/stationapi_pb'
import navigationState from '../store/atoms/navigation'
import notifyState from '../store/atoms/notify'
import stationState from '../store/atoms/station'
import { isJapanese } from '../translation'
import getIsPass from '../utils/isPass'
import sendNotificationAsync from '../utils/native/ios/sensitiveNotificationMoudle'
import {
  getApproachingThreshold,
  getArrivedThreshold,
} from '../utils/threshold'
import useAverageDistance from './useAverageDistance'
import useCanGoForward from './useCanGoForward'
import { useCurrentLine } from './useCurrentLine'
import { useNearestStation } from './useNearestStation'
import { useNextStation } from './useNextStation'
import useStationNumberIndexFunc from './useStationNumberIndexFunc'

type NotifyType = 'ARRIVED' | 'APPROACHING'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

const useRefreshStation = (): void => {
  const [{ stations, selectedDirection }, setStation] =
    useRecoilState(stationState)
  const setNavigation = useSetRecoilState(navigationState)
  const displayedNextStation = useNextStation()
  const [approachingNotifiedId, setApproachingNotifiedId] = useState<number>()
  const [arrivedNotifiedId, setArrivedNotifiedId] = useState<number>()
  const { targetStationIds } = useRecoilValue(notifyState)

  const nearestStation = useNearestStation()
  const currentLine = useCurrentLine()
  const canGoForward = useCanGoForward()
  const getStationNumberIndex = useStationNumberIndexFunc()
  const avgDistance = useAverageDistance()

  const isArrived = useMemo((): boolean => {
    const ARRIVED_THRESHOLD = getArrivedThreshold(
      currentLine?.lineType,
      avgDistance
    )
    return (nearestStation?.distance || 0) < ARRIVED_THRESHOLD
  }, [avgDistance, currentLine?.lineType, nearestStation])

  const isApproaching = useMemo((): boolean => {
    if (!displayedNextStation || !nearestStation?.distance) {
      return false
    }
    const approachingThreshold = getApproachingThreshold(
      currentLine?.lineType,
      avgDistance
    )

    const nearestStationIndex = stations.findIndex(
      (s) => s.id === nearestStation.id
    )
    const nextStationIndex = stations.findIndex(
      (s) => s.id === displayedNextStation?.id
    )

    const isNearestStationAfterThanCurrentStop =
      selectedDirection === 'INBOUND'
        ? nearestStationIndex >= nextStationIndex
        : nearestStationIndex <= nextStationIndex

    // approachingThreshold以上次の駅から離れている: つぎは
    // approachingThresholdより近い: まもなく
    return (
      nearestStation.distance < approachingThreshold &&
      isNearestStationAfterThanCurrentStop
    )
  }, [
    avgDistance,
    currentLine?.lineType,
    displayedNextStation,
    nearestStation,
    selectedDirection,
    stations,
  ])

  const sendApproachingNotification = useCallback(
    async (s: Station.AsObject, notifyType: NotifyType) => {
      const stationNumberIndex = getStationNumberIndex(s)
      const stationNumber =
        s.stationNumbersList[stationNumberIndex]?.stationNumber
      const stationNumberMaybeEmpty = `${
        stationNumber ? `(${stationNumber})` : ''
      }`
      const approachingText = isJapanese
        ? `まもなく、${s.name}${stationNumberMaybeEmpty}に到着します。`
        : `Arriving at ${s.nameRoman}${stationNumberMaybeEmpty}.`
      const arrivedText = isJapanese
        ? `ただいま、${s.name}${stationNumberMaybeEmpty}に到着しました。`
        : `Now stopping at ${s.nameRoman}${stationNumberMaybeEmpty}.`

      await sendNotificationAsync({
        title: isJapanese ? 'お知らせ' : 'Announcement',
        body: notifyType === 'APPROACHING' ? approachingText : arrivedText,
      })
    },
    [getStationNumberIndex]
  )

  useEffect(() => {
    setStation((prev) => ({
      ...prev,
      arrived: !displayedNextStation || isArrived, // 次の駅が存在しない場合、終点到着とみなす
      approaching: isApproaching,
    }))
  }, [displayedNextStation, isApproaching, isArrived, setStation])

  useEffect(() => {
    if (!nearestStation || !canGoForward) {
      return
    }

    const isNearestStationNotifyTarget = !!targetStationIds.find(
      (id) => id === nearestStation.id
    )

    if (isNearestStationNotifyTarget) {
      if (isApproaching && nearestStation.id !== approachingNotifiedId) {
        sendApproachingNotification(nearestStation, 'APPROACHING')
        setApproachingNotifiedId(nearestStation.id)
      }
      if (isArrived && nearestStation.id !== arrivedNotifiedId) {
        sendApproachingNotification(nearestStation, 'ARRIVED')
        setArrivedNotifiedId(nearestStation.id)
      }
    }

    if (isArrived) {
      setStation((prev) => ({
        ...prev,
        station:
          !prev.station || prev.station.id !== nearestStation.id
            ? nearestStation
            : prev.station,
      }))
      if (!getIsPass(nearestStation)) {
        setNavigation((prev) => ({
          ...prev,
          stationForHeader:
            !prev.stationForHeader ||
            prev.stationForHeader.id !== nearestStation.id
              ? nearestStation
              : prev.stationForHeader,
        }))
      }
    }
  }, [
    approachingNotifiedId,
    arrivedNotifiedId,
    canGoForward,
    isApproaching,
    isArrived,
    nearestStation,
    sendApproachingNotification,
    setNavigation,
    setStation,
    targetStationIds,
  ])
}

export default useRefreshStation
