import firestore from '@react-native-firebase/firestore'
import { useCallback, useEffect, useState } from 'react'
import { GetStationByIdListRequest } from '../../gen/proto/stationapi_pb'
import { grpcClient } from '../lib/grpc'
import { SavedRoute } from '../models/SavedRoute'
import useAnonymousUser from './useAnonymousUser'

export const useSavedRoutes = () => {
  useAnonymousUser()
  const [routes, setRoutes] = useState<SavedRoute[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchRoutesAsync = async () => {
      setLoading(true)
      const routesSnapshot = await firestore()
        .collection('uploadedCommunityRoutes')
        .orderBy('createdAt', 'desc')
        .get()
      const routes = routesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setRoutes(routes as SavedRoute[])
      setLoading(false)
    }
    fetchRoutesAsync()
  }, [])

  const fetchStationsByRoute = useCallback(async (route: SavedRoute) => {
    const req = new GetStationByIdListRequest()
    req.ids = route.stations.map((sta) => sta.id)
    const res = await grpcClient.getStationByIdList(req, {})
    const stations = res?.stations ?? []
    return stations.map((sta, idx) => ({
      ...sta,
      stopCondition: route.stations[idx].stopCondition,
      trainType: route.trainType,
    }))
  }, [])

  return { routes, loading, fetchStationsByRoute }
}
