import firestore from '@react-native-firebase/firestore'
import useSWR from 'swr'
import useSWRMutation from 'swr/dist/mutation'
import { GetStationByIdListRequest } from '../../gen/proto/stationapi_pb'
import { grpcClient } from '../lib/grpc'
import { SavedRoute } from '../models/SavedRoute'
import useCachedInitAnonymousUser from './useCachedAnonymousUser'

export const useSavedRoutes = () => {
  useCachedInitAnonymousUser()

  const {
    data: routes,
    isLoading: isRoutesLoading,
    error: fetchRoutesError,
  } = useSWR<SavedRoute[]>('/firestore/uploadedCommunityRoutes', async () => {
    const routesSnapshot = await firestore()
      .collection('uploadedCommunityRoutes')
      .orderBy('createdAt', 'desc')
      .get()

    return routesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as SavedRoute[]
  })

  const {
    isMutating: isStationsLoading,
    error: fetchStationsError,
    trigger: fetchStationsByRoute,
  } = useSWRMutation(
    '/app.trainlcd.grpc/GetStationByIdListRequest',
    async (_, { arg: route }: { arg: SavedRoute }) => {
      const req = new GetStationByIdListRequest()
      req.ids = route.stations.map((sta) => sta.id)
      const res = await grpcClient.getStationByIdList(req, {})
      const stations = res?.stations ?? []

      return stations.map((sta) => ({
        ...sta,
        stopCondition: route.stations.find((rs) => rs.id === sta.id)
          ?.stopCondition,
        trainType: route.trainType,
      }))
    }
  )

  return {
    routes,
    loading: isRoutesLoading || isStationsLoading,
    error: fetchRoutesError || fetchStationsError,
    fetchStationsByRoute,
  }
}
