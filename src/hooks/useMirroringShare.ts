import { FirebaseDatabaseTypes } from '@react-native-firebase/database'
import { useNavigation } from '@react-navigation/native'
import * as Location from 'expo-location'
import { useCallback, useEffect, useRef } from 'react'
import { Alert } from 'react-native'
import { useRecoilState, useRecoilValue, useResetRecoilState } from 'recoil'
import { LOCATION_TASK_NAME } from '../constants/location'
import { Line, Station, TrainType } from '../gen/stationapi_pb'
import { LineDirection } from '../models/Bound'
import lineState from '../store/atoms/line'
import locationState from '../store/atoms/location'
import mirroringShareState from '../store/atoms/mirroringShare'
import navigationState from '../store/atoms/navigation'
import stationState, { initialStationState } from '../store/atoms/station'
import { translate } from '../translation'
import database from '../vendor/firebase/database'
import useCachedInitAnonymousUser from './useCachedAnonymousUser'

type InitialPayload = {
  selectedLine: Line.AsObject | null
  selectedBound: Station.AsObject | null
  trainType: TrainType.AsObject | null
  selectedDirection: LineDirection | null
  stations: Station.AsObject[]
  station: Station.AsObject | null
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
  togglePublishing: () => void
  subscribe: (publisherToken: string) => Promise<void>
  unsubscribe: () => void
} => {
  const [{ location: myLocation }, setLocationState] =
    useRecoilState(locationState)
  const { selectedLine: mySelectedLine } = useRecoilValue(lineState)
  const [
    {
      selectedBound: mySelectedBound,
      selectedDirection: mySelectedDirection,
      station: myStation,
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
  const resetLineState = useResetRecoilState(lineState)
  const resetMirroringShareState = useResetRecoilState(mirroringShareState)

  const sessionDbRef = useRef<FirebaseDatabaseTypes.Reference>()

  const user = useCachedInitAnonymousUser()
  const navigation = useNavigation()

  const updateDB = useCallback(
    async (
      payload: InitialPayload | CoordinatesPayload | VisitorPayload,
      customDB: FirebaseDatabaseTypes.Reference
    ) => await customDB.update({ ...payload }),
    []
  )

  const togglePublishing = useCallback(async () => {
    if (!user) {
      return
    }
    setMirroringShareState((prev) => ({ ...prev, publishing: true }))

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
          station: myStation,
        },
        db
      )

      setMirroringShareState((prev) => ({
        ...prev,
        publishing: true,
        token: prev.token || user.uid,
        publishStartedAt: new Date(),
      }))
    } catch (err) {
      Alert.alert(translate('errorTitle'), (err as { message: string }).message)
    }
  }, [
    mySelectedBound,
    mySelectedDirection,
    mySelectedLine,
    myStation,
    myStations,
    myTrainType,
    setMirroringShareState,
    updateDB,
    user,
  ])

  const resetState = useCallback(
    (sessionEnded?: boolean) => {
      setStationState((prev) => ({
        ...initialStationState,
        station: prev.station,
      }))
      resetLineState()
      resetMirroringShareState()

      if (sessionEnded) {
        navigation.navigate('SelectLine')
      }
    },
    [navigation, resetLineState, resetMirroringShareState, setStationState]
  )

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

      setLocationState((prev) => {
        if (
          prev.location?.coords.latitude === latitude ||
          prev.location?.coords.longitude === longitude
        ) {
          return prev
        }
        return {
          ...prev,
          location: {
            coords: {
              latitude,
              longitude,
              accuracy,
            },
          },
        }
      })

      // 受信できたことを報告する
      await updateVisitorTimestamp()
    },
    [setLocationState, updateVisitorTimestamp]
  )

  const unsubscribe = useCallback(async () => {
    resetState()

    if (!subscribing) {
      return
    }

    if (sessionDbRef.current) {
      sessionDbRef.current.off('value')
    }

    resetState(true)
    Alert.alert(translate('annoucementTitle'), translate('mirroringShareEnded'))
  }, [resetState, subscribing])

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
      setMirroringShareState((prev) => ({
        ...prev,
        subscribing: true,
      }))

      if (publishing) {
        throw new Error(translate('subscribeProhibitedError'))
      }

      sessionDbRef.current = database().ref(
        `/mirroringShare/sessions/${publisherToken}`
      )

      const publisherDataSnapshot = await sessionDbRef.current.once('value')
      if (!publisherDataSnapshot.exists()) {
        throw new Error(translate('publisherNotFound'))
      }

      const data = publisherDataSnapshot.val() as Payload
      if (!data?.info?.selectedBound || !data?.info.selectedLine) {
        throw new Error(translate('publisherNotReady'))
      }

      if (!data.info) {
        return
      }

      const {
        station,
        selectedBound,
        selectedDirection,
        selectedLine,
        stations,
        trainType,
      } = data.info

      setStationState((prev) => ({
        ...prev,
        station,
        selectedBound,
        selectedDirection,
        selectedLine,
        stations,
      }))

      setNavigationState((prev) => ({ ...prev, trainType }))

      setMirroringShareState((prev) => ({
        ...prev,
        token: publisherToken,
      }))

      sessionDbRef.current?.on('value', onSnapshotValueChangeListener)

      Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
    },
    [
      onSnapshotValueChangeListener,
      publishing,
      setMirroringShareState,
      setNavigationState,
      setStationState,
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
    togglePublishing,
    subscribe,
    unsubscribe,
  }
}

export default useMirroringShare
