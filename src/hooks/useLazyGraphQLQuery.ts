import { useQueryClient } from '@tanstack/react-query';
import type { DocumentNode } from 'graphql';
import { useCallback, useRef, useState } from 'react';
import { gqlRequest, graphqlQueryKey } from '~/lib/gql';

export type LazyGraphQLQueryState<TData> = {
  data: TData | undefined;
  loading: boolean;
  error: Error | undefined;
  called: boolean;
};

export type LazyGraphQLQueryExecuteResult<TData> = {
  data: TData | undefined;
  error: Error | undefined;
};

export type LazyGraphQLQueryExecute<TData, TVariables> = (options?: {
  variables?: TVariables;
}) => Promise<LazyGraphQLQueryExecuteResult<TData>>;

// Apollo Client の useLazyQuery 互換の命令的フェッチフック。
// execute はエラー時も reject せず { data, error } で解決する(Apollo と同じ
// 契約で、呼び出し側は try/catch なしで result.data?.x ?? [] と書ける)。
export const useLazyGraphQLQuery = <
  TData,
  TVariables extends object = Record<string, unknown>,
>(
  document: DocumentNode
): [
  LazyGraphQLQueryExecute<TData, TVariables>,
  LazyGraphQLQueryState<TData>,
] => {
  const queryClient = useQueryClient();
  const [state, setState] = useState<LazyGraphQLQueryState<TData>>({
    data: undefined,
    loading: false,
    error: undefined,
    called: false,
  });
  // 古いリクエストの完了が新しいリクエストの state を上書きしないようにする
  const latestRequestIdRef = useRef(0);

  const execute = useCallback<LazyGraphQLQueryExecute<TData, TVariables>>(
    async (options) => {
      const requestId = ++latestRequestIdRef.current;
      setState((prev) => ({
        ...prev,
        loading: true,
        called: true,
        error: undefined,
      }));
      try {
        const data = await queryClient.fetchQuery<TData>({
          queryKey: graphqlQueryKey(document, options?.variables),
          queryFn: () => gqlRequest<TData>(document, options?.variables),
        });
        if (requestId === latestRequestIdRef.current) {
          setState({ data, loading: false, error: undefined, called: true });
        }
        return { data, error: undefined };
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        if (requestId === latestRequestIdRef.current) {
          setState((prev) => ({ ...prev, loading: false, error }));
        }
        return { data: undefined, error };
      }
    },
    [document, queryClient]
  );

  return [execute, state];
};
