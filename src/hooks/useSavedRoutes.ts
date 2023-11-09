import { useCallback, useEffect, useState } from 'react'
import { GetStationByIdListRequest } from '../gen/stationapi_pb'
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
      req.setIdsList(route.stations.map((sta) => sta.id))
      const res = await grpcClient?.getStationByIdList(req, {})
      return res?.toObject().stationsList
    },
    [grpcClient]
  )

  return { routes, loading, fetchStationsByRoute }
}
