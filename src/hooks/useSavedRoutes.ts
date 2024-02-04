import { useCallback, useEffect, useState } from 'react'
import { GetStationByIdListRequest } from '../../gen/proto/stationapi_pb'
import { SavedRoute } from '../models/SavedRoute'
import firestore from '../vendor/firebase/firestore'
import useAnonymousUser from './useAnonymousUser'
import useGRPC from './useGRPC'

export const useSavedRoutes = () => {
  useAnonymousUser()
  const [routes, setRoutes] = useState<SavedRoute[]>([])
  const [loading, setLoading] = useState(false)

  const grpcClient = useGRPC()

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

  const fetchStationsByRoute = useCallback(
    async (route: SavedRoute) => {
      const req = new GetStationByIdListRequest()
      req.ids = route.stations.map((sta) => sta.id)
      const res = await grpcClient?.getStationByIdList(req, {})
      const stations = res?.stations ?? []
      return stations.map((sta, idx) => ({
        ...sta,
        stopCondition: route.stations[idx].stopCondition,
        trainType: route.trainType,
      }))
    },
    [grpcClient]
  )

  return { routes, loading, fetchStationsByRoute }
}
