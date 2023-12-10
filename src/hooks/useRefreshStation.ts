import * as Notifications from 'expo-notifications'
import getDistance from 'geolib/es/getDistance'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import { Station } from '../gen/stationapi_pb'
import locationState from '../store/atoms/location'
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
import { useAccuracy } from './useAccuracy'
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
  const setStation = useSetRecoilState(stationState)
  const setNavigation = useSetRecoilState(navigationState)
  const { location } = useRecoilValue(locationState)
  const nextStation = useNextStation(true)
  const approachingNotifiedIdRef = useRef<number>()
  const arrivedNotifiedIdRef = useRef<number>()
  const { targetStationIds } = useRecoilValue(notifyState)

  const nearestStation = useNearestStation()
  const currentLine = useCurrentLine()
  const canGoForward = useCanGoForward()
  const getStationNumberIndex = useStationNumberIndexFunc()
  const avgDistance = useAverageDistance()
  const { computeDistanceAccuracy } = useAccuracy()

  const isArrived = useMemo((): boolean => {
    const arrivedThreshold = getArrivedThreshold(
      currentLine?.lineType,
      avgDistance
    )
    return (nearestStation?.distance || 0) < arrivedThreshold
  }, [avgDistance, currentLine?.lineType, nearestStation])

  const isApproaching = useMemo((): boolean => {
    if (!location) {
      return false
    }
    const approachingThreshold = getApproachingThreshold(
      currentLine?.lineType,
      avgDistance
    )

    const { latitude, longitude } = location.coords

    const betweenDistance = getDistance(
      {
        latitude: nextStation?.latitude ?? 0,
        longitude: nextStation?.longitude ?? 0,
      },
      { latitude, longitude },
      computeDistanceAccuracy
    )

    // approachingThreshold以上次の駅から離れている: つぎは
    // approachingThresholdより近い: まもなく
    return betweenDistance < approachingThreshold
  }, [
    avgDistance,
    computeDistanceAccuracy,
    currentLine?.lineType,
    nextStation,
    location,
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
    if (!nearestStation || !canGoForward) {
      return
    }

    const isNearestStationNotifyTarget = !!targetStationIds.find(
      (id) => id === nearestStation.id
    )

    if (isNearestStationNotifyTarget) {
      if (
        isApproaching &&
        nearestStation.id !== approachingNotifiedIdRef.current
      ) {
        sendApproachingNotification(nearestStation, 'APPROACHING')
        approachingNotifiedIdRef.current = nearestStation.id
      }
      if (isArrived && nearestStation.id !== arrivedNotifiedIdRef.current) {
        sendApproachingNotification(nearestStation, 'ARRIVED')
        arrivedNotifiedIdRef.current = nearestStation.id
      }
    }

    setStation((prev) => ({
      ...prev,
      arrived: isArrived,
      approaching: isApproaching,
    }))

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
