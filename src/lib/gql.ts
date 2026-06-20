import { QueryClient } from '@tanstack/react-query';
import {
  type DocumentNode,
  Kind,
  type OperationDefinitionNode,
  print,
} from 'graphql';
import { GraphQLClient, type Variables } from 'graphql-request';
import DeviceInfo from 'react-native-device-info';
import {
  DEV_API_URL,
  PRODUCTION_API_URL,
  STAGING_API_URL,
} from 'react-native-dotenv';
import { isDevApp } from '~/utils/isDevApp';

const assertUrl = (name: string, value?: string | null): string => {
  if (value === undefined || value === null || value.trim() === '') {
    throw new Error(
      `[GraphQL Client Configuration Error] Missing or empty ${name}. Please check your .env.local file and ensure the ${name} is properly configured.`
    );
  }
  return value;
};

const uri = (() => {
  if (__DEV__ && DeviceInfo.isEmulatorSync()) {
    return assertUrl('DEV_API_URL', DEV_API_URL);
  }

  if (isDevApp) {
    return assertUrl('STAGING_API_URL', STAGING_API_URL);
  }

  return assertUrl('PRODUCTION_API_URL', PRODUCTION_API_URL);
})();

const graphQLClient = new GraphQLClient(uri);

// Apollo InMemoryCache (cache-first) 相当: 一度取得したクエリは同一セッション中
// 再フェッチしない。強制的に再取得したい箇所は queryClient.removeQueries で
// 該当キーを破棄してからフェッチする。
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: Number.POSITIVE_INFINITY,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

const operationNameCache = new WeakMap<DocumentNode, string>();

const getOperationKey = (document: DocumentNode): string => {
  const cached = operationNameCache.get(document);
  if (cached) {
    return cached;
  }
  // 無名オペレーションは想定外だが、キーの衝突を避けるため全文へフォールバック
  const name =
    document.definitions.find(
      (def): def is OperationDefinitionNode =>
        def.kind === Kind.OPERATION_DEFINITION
    )?.name?.value ?? print(document);
  operationNameCache.set(document, name);
  return name;
};

export const graphqlQueryKey = (
  document: DocumentNode,
  variables?: object
): readonly unknown[] => [getOperationKey(document), variables ?? null];

export const gqlRequest = <TData>(
  document: DocumentNode,
  variables?: object
): Promise<TData> =>
  graphQLClient.request<TData>(document, variables as Variables);

// Apollo Client の client.query 互換ファサード。フック外からの命令的フェッチ用。
// queryClient.fetchQuery 経由なのでキャッシュ済みなら再フェッチしない。
export const gqlClient = {
  query: async <TData>({
    query,
    variables,
  }: {
    query: DocumentNode;
    variables?: object;
  }): Promise<{ data: TData }> => {
    const data = await queryClient.fetchQuery<TData>({
      queryKey: graphqlQueryKey(query, variables),
      queryFn: () => gqlRequest<TData>(query, variables),
    });
    return { data };
  },
};
