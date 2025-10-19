import { useLazyQuery } from '@apollo/client/react';
import type { Station } from '~/@types/graphql';
import { GET_LINE_GROUP_STATIONS } from '~/lib/graphql/queries';

type GetLineGroupStationsData = {
  lineGroupStations: Station[];
};

type GetLineGroupStationsVariables = {
  lineGroupId: number;
};

export const useTrainTypeStations = () => {
  const [fetchStations, { data, loading, error }] = useLazyQuery<
    GetLineGroupStationsData,
    GetLineGroupStationsVariables
  >(GET_LINE_GROUP_STATIONS);

  return {
    stations: data?.lineGroupStations ?? [],
    isLoading: loading,
    error,
    fetchStations: (variables: GetLineGroupStationsVariables) =>
      fetchStations({ variables }),
  };
};
