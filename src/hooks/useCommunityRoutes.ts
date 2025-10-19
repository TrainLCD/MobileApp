import { useLazyQuery } from '@apollo/client/react';
import {
  collection,
  type FirebaseFirestoreTypes,
  getDocs,
  getFirestore,
  orderBy,
  query,
} from '@react-native-firebase/firestore';
import { useEffect, useState } from 'react';
import type { Station } from '~/@types/graphql';
import { GET_STATIONS } from '~/lib/graphql/queries';
import type { CommunityRoute } from '../models/CommunityRoute';
import { useCachedInitAnonymousUser } from './useCachedAnonymousUser';

type GetStationsData = {
  stations: Station[];
};

type GetStationsVariables = {
  ids: number[];
};

export const useCommunityRoutes = () => {
  useCachedInitAnonymousUser();

  const [routes, setRoutes] = useState<CommunityRoute[]>();
  const [isRoutesLoading, setIsRoutesLoading] = useState(false);
  const [fetchRoutesError, setFetchRoutesError] = useState<Error>();

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        setIsRoutesLoading(true);
        const db = getFirestore();

        const q = query(
          collection(db, 'uploadedCommunityRoutes'),
          orderBy('createdAt', 'desc')
        );

        const fetchedRoutes = (await getDocs(q)).docs.map((doc) => {
          const data = doc.data() as FirebaseFirestoreTypes.DocumentData;
          const createdAt: Date =
            typeof data?.createdAt?.toDate === 'function'
              ? data.createdAt.toDate()
              : new Date();
          return {
            id: doc.id,
            userId: data.userId,
            name: data.name,
            stations: data.stations,
            createdAt,
            trainType: data.trainType,
          } as CommunityRoute;
        });

        setRoutes(fetchedRoutes);
      } catch (error) {
        setFetchRoutesError(error as Error);
      } finally {
        setIsRoutesLoading(false);
      }
    };

    fetchRoutes();
  }, []);

  const [
    fetchStationsByRoute,
    { loading: isStationsLoading, error: fetchStationsError },
  ] = useLazyQuery<GetStationsData, GetStationsVariables>(GET_STATIONS);

  return {
    routes,
    loading: isRoutesLoading || isStationsLoading,
    error: fetchRoutesError || fetchStationsError,
    fetchStationsByRoute: (variables: GetStationsVariables) =>
      fetchStationsByRoute({ variables }),
  };
};
