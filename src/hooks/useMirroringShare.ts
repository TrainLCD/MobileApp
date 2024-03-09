import database, {
  FirebaseDatabaseTypes,
} from '@react-native-firebase/database'
import * as Location from 'expo-location'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert } from 'react-native'
import { useRecoilState, useResetRecoilState } from 'recoil'
import { Line, Station, TrainType } from '../../gen/proto/stationapi_pb'
import { LOCATION_TASK_NAME } from '../constants'
import { LineDirection } from '../models/Bound'
import lineState from '../store/atoms/line'
import locationState from '../store/atoms/location'
import mirroringShareState from '../store/atoms/mirroringShare'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import { translate } from '../translation'
import useCachedInitAnonymousUser from './useCachedAnonymousUser'

type InitialPayload = {
  selectedLine: Line | null
  selectedBound: Station | null
  trainType: TrainType | null
  selectedDirection: LineDirection | null
  stations: Station[]
}

type CoordinatesPayload = {
  latitude: number
  longitude: number
  accuracy: number
}

type Payload = {
  info?: InitialPayload
  live?: CoordinatesPayload
}

type VisitorPayload = {
  // ライブラリ側でobject型を使っているのでLintを無視する
  // eslint-disable-next-line @typescript-eslint/ban-types
  timestamp: object
  inactive: boolean
}

const useMirroringShare = (
  publisher = false
): {
  startPublishing: () => void
  stopPublishing: () => void
  subscribe: (publisherToken: string) => Promise<void>
  unsubscribe: () => void
  loading: boolean
} => {
  const [loading, setLoading] = useState(false)

  const [{ location: myLocation }, setLocationState] =
    useRecoilState(locationState)
  const [{ selectedLine: mySelectedLine }, setLineState] =
    useRecoilState(lineState)
  const [
    {
      selectedBound: mySelectedBound,
      selectedDirection: mySelectedDirection,
      stations: myStations,
    },
    setStationState,
  ] = useRecoilState(stationState)
  const [{ trainType: myTrainType }, setNavigationState] =
    useRecoilState(navigationState)
  const [
    { token, publishing, publishStartedAt, subscribing },
    setMirroringShareState,
  ] = useRecoilState(mirroringShareState)
  const resetStationState = useResetRecoilState(stationState)
  const resetLineState = useResetRecoilState(lineState)
  const resetNavigationState = useResetRecoilState(navigationState)
  const resetMirroringShareState = useResetRecoilState(mirroringShareState)

  const sessionDbRef = useRef<FirebaseDatabaseTypes.Reference>()

  const user = useCachedInitAnonymousUser()

  const updateDB = useCallback(
    async (
      payload: InitialPayload | CoordinatesPayload | VisitorPayload,
      customDB: FirebaseDatabaseTypes.Reference
    ) => await customDB.update({ ...payload }),
    []
  )

  const startPublishing = useCallback(async () => {
    if (!user) {
      return
    }

    setMirroringShareState((prev) => ({ ...prev, publishing: true }))
    setLoading(true)

    try {
      const db = database().ref(`/mirroringShare/sessions/${user.uid}/info`)

      // 最初に必要なデータを送る
      await updateDB(
        {
          selectedLine: mySelectedLine,
          selectedBound: mySelectedBound,
          selectedDirection: mySelectedDirection,
          trainType: myTrainType,
          stations: myStations,
        },
        db
      )

      setMirroringShareState((prev) => ({
        ...prev,
        token: prev.token || user.uid,
        publishStartedAt: new Date(),
      }))
      setLoading(false)
    } catch (err) {
      setLoading(false)
      setMirroringShareState((prev) => ({ ...prev, publishing: false }))
      Alert.alert(translate('errorTitle'), (err as { message: string }).message)
    }
  }, [
    mySelectedBound,
    mySelectedDirection,
    mySelectedLine,
    myStations,
    myTrainType,
    setMirroringShareState,
    updateDB,
    user,
  ])

  const stopPublishing = useCallback(async () => {
    if (!user) {
      return
    }

    setLoading(true)

    try {
      const db = database().ref(`/mirroringShare/sessions/${user.uid}`)

      await db.remove()

      setMirroringShareState((prev) => ({
        ...prev,
        publishing: false,
        token: null,
        publishStartedAt: null,
      }))
      setLoading(false)
    } catch (err) {
      setLoading(false)
      Alert.alert(translate('errorTitle'), (err as { message: string }).message)
    }
  }, [setMirroringShareState, user])

  const resetState = useCallback(() => {
    resetStationState()

    resetLineState()
    resetNavigationState()
    resetMirroringShareState()
  }, [
    resetLineState,
    resetMirroringShareState,
    resetNavigationState,
    resetStationState,
  ])

  const updateVisitorTimestamp = useCallback(async () => {
    if (!user || !token) {
      return
    }
    const db = database().ref(`/mirroringShare/visitors/${token}/${user.uid}`)

    updateDB(
      {
        timestamp: database.ServerValue.TIMESTAMP,
        inactive: false,
      },
      db
    )
  }, [token, updateDB, user])

  const onSnapshotValueChange = useCallback(
    async (data: FirebaseDatabaseTypes.DataSnapshot) => {
      const liveData = (data.val() as Payload).live
      if (!liveData) {
        return
      }
      const { latitude, longitude, accuracy } = liveData

      if (!latitude || !longitude) {
        return
      }

      setLocationState((prev) => ({
        ...prev,
        location: {
          timestamp: -1,
          coords: {
            latitude,
            longitude,
            accuracy,
            altitude: 0,
            altitudeAccuracy: -1,
            speed: 0,
            heading: 0,
          },
        },
      }))

      // 受信できたことを報告する
      await updateVisitorTimestamp()
    },
    [setLocationState, updateVisitorTimestamp]
  )

  const unsubscribe = useCallback(async () => {
    if (!subscribing) {
      return
    }

    if (sessionDbRef.current) {
      sessionDbRef.current.off('value')
    }

    resetMirroringShareState()

    Alert.alert(translate('annoucementTitle'), translate('mirroringShareEnded'))
  }, [resetMirroringShareState, subscribing])

  const onVisitorChange = useCallback(
    async (data: FirebaseDatabaseTypes.DataSnapshot) => {
      if (!data.exists()) {
        setMirroringShareState((prev) => ({
          ...prev,
          activeVisitors: 0,
        }))
        return
      }

      const visitors = data.val() as { [key: string]: VisitorPayload }
      const total = Object.keys(visitors).filter((key) => {
        // 過去の配信の購読者なのでデータを消す
        if (
          publishStartedAt &&
          (visitors[key].timestamp as unknown as number) <
            publishStartedAt?.getTime()
        ) {
          database().ref(`/mirroringShare/visitors/${token}/${key}`).remove()
          return false
        }
        return true
      })
      const active = Object.keys(visitors).filter(
        (key) => !visitors[key].inactive
      )
      setMirroringShareState((prev) => ({
        ...prev,
        totalVisitors: total.length,
        activeVisitors: active.length,
      }))

      if (!user) {
        return
      }
    },
    [publishStartedAt, setMirroringShareState, token, user]
  )

  const onSnapshotValueChangeListener = useCallback(
    async (d: FirebaseDatabaseTypes.DataSnapshot) => {
      try {
        await onSnapshotValueChange(d)
      } catch (err) {
        console.error(err)
        await unsubscribe()
      }
    },
    [onSnapshotValueChange, unsubscribe]
  )

  const subscribe = useCallback(
    async (publisherToken: string) => {
      if (subscribing) {
        return
      }

      if (publishing) {
        throw new Error(translate('subscribeProhibitedError'))
      }

      sessionDbRef.current = database().ref(
        `/mirroringShare/sessions/${publisherToken}`
      )

      const publisherDataSnapshot = await sessionDbRef.current.once('value')
      const data = publisherDataSnapshot.val() as Payload

      if (!publisherDataSnapshot.exists()) {
        throw new Error(translate('publisherNotFound'))
      }

      if (!data?.info?.selectedBound || !data?.info.selectedLine) {
        throw new Error(translate('publisherNotReady'))
      }

      resetState()

      const {
        selectedBound,
        selectedDirection,
        selectedLine,
        stations,
        trainType,
      } = data.info

      setStationState((prev) => ({
        ...prev,
        selectedBound,
        selectedDirection,
        stations,
      }))

      setLineState((prev) => ({ ...prev, selectedLine }))

      setNavigationState((prev) => ({ ...prev, trainType }))

      setMirroringShareState((prev) => ({
        ...prev,
        token: publisherToken,
        subscribing: true,
      }))

      sessionDbRef.current?.on('value', onSnapshotValueChangeListener)

      Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
    },
    [
      onSnapshotValueChangeListener,
      publishing,
      resetState,
      setLineState,
      setMirroringShareState,
      setNavigationState,
      setStationState,
      subscribing,
    ]
  )

  const publishAsync = useCallback(async () => {
    try {
      if (!myLocation || !user) {
        return
      }

      const liveDbRef = database().ref(
        `/mirroringShare/sessions/${user.uid}/live`
      )

      await updateDB(
        {
          latitude: myLocation?.coords.latitude,
          longitude: myLocation?.coords.longitude,
          accuracy: myLocation?.coords.accuracy ?? 0,
          timestamp: database.ServerValue.TIMESTAMP,
        },
        liveDbRef
      )
    } catch (err) {
      Alert.alert(translate('errorTitle'), (err as { message: string }).message)
    }
  }, [myLocation, updateDB, user])

  useEffect(() => {
    if (publisher && publishing) {
      publishAsync()
    }
  }, [publishAsync, publisher, publishing])

  const subscribeVisitorsAsync = useCallback(async () => {
    if (publisher && publishing && token) {
      const ref = database().ref(`/mirroringShare/visitors/${token}`)
      ref.on('value', onVisitorChange)
      return () => {
        ref.off('value', onVisitorChange)
      }
    }
    return () => undefined
  }, [onVisitorChange, publisher, publishing, token])

  useEffect(() => {
    subscribeVisitorsAsync()
  }, [subscribeVisitorsAsync])

  return {
    startPublishing,
    stopPublishing,
    subscribe,
    unsubscribe,
    loading,
  }
}

export default useMirroringShare
