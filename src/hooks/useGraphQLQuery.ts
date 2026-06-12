import { useQuery } from '@tanstack/react-query';
import type { DocumentNode } from 'graphql';
import { gqlRequest, graphqlQueryKey } from '~/lib/gql';

export type GraphQLQueryOptions<TVariables> = {
  variables?: TVariables;
  skip?: boolean;
};

export type GraphQLQueryResult<TData> = {
  data: TData | undefined;
  loading: boolean;
  error: Error | undefined;
};

// Apollo Client の useQuery 互換の宣言的フェッチフック。
// variables が変わると queryKey が変わり自動で再フェッチされる。
export const useGraphQLQuery = <
  TData,
  TVariables extends object = Record<string, unknown>,
>(
  document: DocumentNode,
  options: GraphQLQueryOptions<TVariables> = {}
): GraphQLQueryResult<TData> => {
  const { data, isFetching, error } = useQuery<TData, Error>({
    queryKey: graphqlQueryKey(document, options.variables),
    queryFn: () => gqlRequest<TData>(document, options.variables),
    enabled: !options.skip,
  });

  return { data, loading: isFetching, error: error ?? undefined };
};
