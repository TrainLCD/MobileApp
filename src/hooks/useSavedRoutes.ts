import { useMutation } from '@connectrpc/connect-query';
import {
  collection,
  getDocs,
  getFirestore,
  orderBy,
  query,
} from '@react-native-firebase/firestore';
import { useQuery } from '@tanstack/react-query';
import { getStationByIdList } from '~/gen/proto/stationapi-StationAPI_connectquery';
import type { SavedRoute } from '../models/SavedRoute';
import { useCachedInitAnonymousUser } from './useCachedAnonymousUser';

export const useSavedRoutes = () => {
  useCachedInitAnonymousUser();

  const {
    data: routes,
    isLoading: isRoutesLoading,
    error: fetchRoutesError,
  } = useQuery<SavedRoute[]>({
    queryKey: ['/firestore/uploadedCommunityRoutes'],
    queryFn: async () => {
      const db = getFirestore();

      const q = query(
        collection(db, 'uploadedCommunityRoutes'),
        orderBy('createdAt', 'desc')
      );

      return (await getDocs(q)).docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as SavedRoute[];
    },
  });

  const {
    status: isStationsLoading,
    error: fetchStationsError,
    mutateAsync: fetchStationsByRoute,
  } = useMutation(getStationByIdList);

  return {
    routes,
    loading: isRoutesLoading || isStationsLoading === 'pending',
    error: fetchRoutesError || fetchStationsError,
    fetchStationsByRoute,
  };
};
