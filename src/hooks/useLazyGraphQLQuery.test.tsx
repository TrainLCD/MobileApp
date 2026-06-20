import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render } from '@testing-library/react-native';
import type { DocumentNode } from 'graphql';
import type React from 'react';
import { gqlRequest } from '~/lib/gql';
import { useLazyGraphQLQuery } from './useLazyGraphQLQuery';

jest.mock('~/lib/gql', () => ({
  gqlRequest: jest.fn(),
  graphqlQueryKey: jest.fn((_document: unknown, variables?: object) => [
    'TestQuery',
    variables ?? null,
  ]),
}));

const TEST_QUERY = {} as DocumentNode;

type TestData = { stations: number[] };
type TestVariables = { id: number };

type HookResult = ReturnType<
  typeof useLazyGraphQLQuery<TestData, TestVariables>
> | null;

const HookBridge: React.FC<{ onReady: (value: HookResult) => void }> = ({
  onReady,
}) => {
  onReady(useLazyGraphQLQuery<TestData, TestVariables>(TEST_QUERY));
  return null;
};

describe('useLazyGraphQLQuery', () => {
  const mockGqlRequest = gqlRequest as unknown as jest.Mock;

  const renderHookWithClient = () => {
    // アプリ本体 (src/lib/gql.ts) と同じ cache-first 相当の設定で検証する。
    // gcTime: Infinity は GC タイマーを止めて Jest プロセスの終了を妨げないため
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: Number.POSITIVE_INFINITY,
          gcTime: Number.POSITIVE_INFINITY,
        },
      },
    });
    const hookRef: { current: HookResult } = { current: null };
    render(
      <QueryClientProvider client={queryClient}>
        <HookBridge
          onReady={(v) => {
            hookRef.current = v;
          }}
        />
      </QueryClientProvider>
    );
    return hookRef;
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('成功時に { data } で解決し state を更新する', async () => {
    mockGqlRequest.mockResolvedValue({ stations: [1, 2] });
    const hookRef = renderHookWithClient();

    expect(hookRef.current?.[1].called).toBe(false);

    await act(async () => {
      const result = await hookRef.current?.[0]({ variables: { id: 1 } });
      expect(result?.data).toEqual({ stations: [1, 2] });
      expect(result?.error).toBeUndefined();
    });

    expect(hookRef.current?.[1].data).toEqual({ stations: [1, 2] });
    expect(hookRef.current?.[1].loading).toBe(false);
    expect(hookRef.current?.[1].error).toBeUndefined();
    expect(hookRef.current?.[1].called).toBe(true);
  });

  it('エラー時は reject せず { error } で解決し state にも反映する', async () => {
    mockGqlRequest.mockRejectedValue(new Error('network down'));
    const hookRef = renderHookWithClient();

    await act(async () => {
      const result = await hookRef.current?.[0]({ variables: { id: 1 } });
      expect(result?.data).toBeUndefined();
      expect(result?.error?.message).toBe('network down');
    });

    expect(hookRef.current?.[1].error?.message).toBe('network down');
    expect(hookRef.current?.[1].loading).toBe(false);
  });

  it('同一 variables の2回目はキャッシュから返し再フェッチしない', async () => {
    mockGqlRequest.mockResolvedValue({ stations: [1] });
    const hookRef = renderHookWithClient();

    await act(async () => {
      await hookRef.current?.[0]({ variables: { id: 1 } });
      await hookRef.current?.[0]({ variables: { id: 1 } });
    });

    expect(mockGqlRequest).toHaveBeenCalledTimes(1);
  });

  it('variables が異なれば再フェッチする', async () => {
    mockGqlRequest.mockResolvedValue({ stations: [1] });
    const hookRef = renderHookWithClient();

    await act(async () => {
      await hookRef.current?.[0]({ variables: { id: 1 } });
      await hookRef.current?.[0]({ variables: { id: 2 } });
    });

    expect(mockGqlRequest).toHaveBeenCalledTimes(2);
  });

  it('エラー後の execute で error がリセットされる', async () => {
    mockGqlRequest
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ stations: [3] });
    const hookRef = renderHookWithClient();

    await act(async () => {
      await hookRef.current?.[0]({ variables: { id: 1 } });
    });
    expect(hookRef.current?.[1].error?.message).toBe('boom');

    await act(async () => {
      await hookRef.current?.[0]({ variables: { id: 1 } });
    });
    expect(hookRef.current?.[1].error).toBeUndefined();
    expect(hookRef.current?.[1].data).toEqual({ stations: [3] });
  });
});
