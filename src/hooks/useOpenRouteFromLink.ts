import { useMutation } from '@connectrpc/connect-query'
import { useNavigation } from '@react-navigation/native'
import { findNearest } from 'geolib'
import { useCallback, useEffect } from 'react'
import { useSetRecoilState } from 'recoil'
import {
  getStationsByLineGroupId,
  getStationsByLineId,
} from '../../gen/proto/stationapi-StationAPI_connectquery'
import {
  GetStationByLineIdRequest,
  GetStationsByLineGroupIdRequest,
} from '../../gen/proto/stationapi_pb'
import lineState from '../store/atoms/line'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import { useLocationStore } from './useLocationStore'
import { useResetMainState } from './useResetMainState'

export const useOpenRouteFromLink = () => {
  const navigation = useNavigation()
  const resetState = useResetMainState()

  const setStationState = useSetRecoilState(stationState)
  const setNavigationState = useSetRecoilState(navigationState)
  const setLineState = useSetRecoilState(lineState)

  // NOTE: 位置情報取得を許可していない場合を考慮してデフォで0を設定する
  const latitude = useLocationStore((state) => state?.coords.latitude) ?? 0
  const longitude = useLocationStore((state) => state?.coords.longitude) ?? 0

  const {
    data: stationsByLineGroupId,
    mutate: fetchStationsByLineGroupId,
    status: fetchStationsByLineGroupIdStatus,
    error: fetchStationsByLineGroupIdError,
  } = useMutation(getStationsByLineGroupId)
  const {
    data: stationsByLineId,
    mutate: fetchStationsByLineId,
    status: fetchStationsByLineIdStatus,
    error: fetchStationsByLineIdError,
  } = useMutation(getStationsByLineId)

  const openLink = useCallback(
    (lineGroupId: number | undefined, lineId: number | undefined) => {
      if (lineGroupId) {
        fetchStationsByLineGroupId(
          new GetStationsByLineGroupIdRequest({ lineGroupId })
        )
        return
      }

      if (lineId) {
        fetchStationsByLineId(
          new GetStationByLineIdRequest({
            lineId,
          })
        )
      }
    },
    [fetchStationsByLineGroupId, fetchStationsByLineId]
  )

  useEffect(() => {
    const stations =
      stationsByLineGroupId?.stations ?? stationsByLineId?.stations ?? []
    const nearestCoordinates = findNearest(
      { latitude, longitude },
      stations.map((sta) => ({
        latitude: sta.latitude,
        longitude: sta.longitude,
      }))
    ) as { latitude: number; longitude: number }

    const nearestStation =
      stations.find(
        (sta) =>
          sta.latitude === nearestCoordinates.latitude &&
          sta.longitude === nearestCoordinates.longitude
      ) ?? stations[0] // NOTE: 位置情報取得を許可していない場合を考慮

    const line = nearestStation?.line

    if (!line) {
      return
    }

    resetState()

    setStationState((prev) => ({
      ...prev,
      stations,
      station: nearestStation,
    }))
    setNavigationState((prev) => ({
      ...prev,
      trainType: nearestStation.trainType ?? null,
      leftStations: [],
      stationForHeader: nearestStation,
      fromBuilder: true,
    }))
    setLineState((prev) => ({
      ...prev,
      selectedLine: line,
    }))
    navigation.navigate('SelectBound')
  }, [
    latitude,
    longitude,
    navigation,
    resetState,
    setLineState,
    setNavigationState,
    setStationState,
    stationsByLineGroupId?.stations,
    stationsByLineId?.stations,
  ])

  return {
    openLink,
    isLoading:
      fetchStationsByLineGroupIdStatus === 'pending' ||
      fetchStationsByLineIdStatus === 'pending',
    error: fetchStationsByLineGroupIdError || fetchStationsByLineIdError,
  }
}
