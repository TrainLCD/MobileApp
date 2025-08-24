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
import type { CommunityRoute } from '../models/CommunityRoute';
import { useCachedInitAnonymousUser } from './useCachedAnonymousUser';

export const useCommunityRoutes = () => {
  useCachedInitAnonymousUser();

  const {
    data: routes,
    isLoading: isRoutesLoading,
    error: fetchRoutesError,
  } = useQuery<CommunityRoute[]>({
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
      })) as CommunityRoute[];
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
