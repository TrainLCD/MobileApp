import type { Station } from '~/@types/graphql';
import { GET_LINE_GROUP_STATIONS } from '~/lib/graphql/queries';
import { useLazyGraphQLQuery } from './useLazyGraphQLQuery';

type GetLineGroupStationsData = {
  lineGroupStations: Station[];
};

type GetLineGroupStationsVariables = {
  lineGroupId: number;
};

export const useTrainTypeStations = () => {
  const [fetchLineGroupStations, { data, loading, error }] =
    useLazyGraphQLQuery<
      GetLineGroupStationsData,
      GetLineGroupStationsVariables
    >(GET_LINE_GROUP_STATIONS);

  return {
    stations: data?.lineGroupStations ?? [],
    isLoading: loading,
    error,
    fetchStations: (variables: GetLineGroupStationsVariables) =>
      fetchLineGroupStations({ variables }),
  };
};
