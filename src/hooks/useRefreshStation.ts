import * as Notifications from 'expo-notifications'
import { useCallback, useEffect, useRef } from 'react'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import { Station } from '../../gen/proto/stationapi_pb'
import navigationState from '../store/atoms/navigation'
import notifyState from '../store/atoms/notify'
import stationState from '../store/atoms/station'
import { isJapanese } from '../translation'
import getIsPass from '../utils/isPass'
import sendNotificationAsync from '../utils/native/ios/sensitiveNotificationMoudle'
import useCanGoForward from './useCanGoForward'
import { usePolledStation } from './usePolledStation'
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
  const approachingNotifiedIdRef = useRef<number>()
  const arrivedNotifiedIdRef = useRef<number>()
  const { targetStationIds } = useRecoilValue(notifyState)

  const {
    station: nearestStation,
    isApproaching,
    isArrived,
  } = usePolledStation()
  const canGoForward = useCanGoForward()
  const getStationNumberIndex = useStationNumberIndexFunc()

  const sendApproachingNotification = useCallback(
    async (s: Station, notifyType: NotifyType) => {
      const stationNumberIndex = getStationNumberIndex(s)
      const stationNumber = s.stationNumbers[stationNumberIndex]?.stationNumber
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
  }, [
    canGoForward,
    isApproaching,
    isArrived,
    nearestStation,
    sendApproachingNotification,
    targetStationIds,
  ])

  useEffect(() => {
    setStation((prev) => ({
      ...prev,
      arrived: isArrived,
      approaching: isApproaching,
    }))
  }, [isApproaching, isArrived, setStation])

  useEffect(() => {
    if (isArrived && nearestStation) {
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
  }, [isApproaching, isArrived, nearestStation, setNavigation, setStation])
}

export default useRefreshStation
