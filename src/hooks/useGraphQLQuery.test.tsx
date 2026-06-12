import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react-native';
import type { DocumentNode } from 'graphql';
import type React from 'react';
import { gqlRequest } from '~/lib/gql';
import { useGraphQLQuery } from './useGraphQLQuery';

jest.mock('~/lib/gql', () => ({
  gqlRequest: jest.fn(),
  graphqlQueryKey: jest.fn((_document: unknown, variables?: object) => [
    'TestQuery',
    variables ?? null,
  ]),
}));

const TEST_QUERY = {} as DocumentNode;

type TestData = { stations: number[] };
type TestVariables = { latitude: number };

type HookResult = ReturnType<typeof useGraphQLQuery<TestData>> | null;

const HookBridge: React.FC<{
  variables: TestVariables;
  skip?: boolean;
  onReady: (value: HookResult) => void;
}> = ({ variables, skip, onReady }) => {
  onReady(
    useGraphQLQuery<TestData, TestVariables>(TEST_QUERY, { variables, skip })
  );
  return null;
};

describe('useGraphQLQuery', () => {
  const mockGqlRequest = gqlRequest as unknown as jest.Mock;

  // gcTime: Infinity は GC タイマーを止めて Jest プロセスの終了を妨げないため
  const createQueryClient = () =>
    new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: Number.POSITIVE_INFINITY,
          gcTime: Number.POSITIVE_INFINITY,
        },
      },
    });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('マウント時にフェッチして data を返す', async () => {
    mockGqlRequest.mockResolvedValue({ stations: [1] });
    const hookRef: { current: HookResult } = { current: null };

    render(
      <QueryClientProvider client={createQueryClient()}>
        <HookBridge
          variables={{ latitude: 35 }}
          onReady={(v) => {
            hookRef.current = v;
          }}
        />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(hookRef.current?.data).toEqual({ stations: [1] });
    });
    expect(hookRef.current?.loading).toBe(false);
    expect(hookRef.current?.error).toBeUndefined();
  });

  it('skip 指定時はフェッチしない', async () => {
    const hookRef: { current: HookResult } = { current: null };

    render(
      <QueryClientProvider client={createQueryClient()}>
        <HookBridge
          variables={{ latitude: 35 }}
          skip
          onReady={(v) => {
            hookRef.current = v;
          }}
        />
      </QueryClientProvider>
    );

    expect(mockGqlRequest).not.toHaveBeenCalled();
    expect(hookRef.current?.loading).toBe(false);
    expect(hookRef.current?.data).toBeUndefined();
  });

  it('variables が変わると再フェッチする', async () => {
    mockGqlRequest
      .mockResolvedValueOnce({ stations: [1] })
      .mockResolvedValueOnce({ stations: [2] });
    const hookRef: { current: HookResult } = { current: null };
    const queryClient = createQueryClient();

    const ui = (variables: TestVariables) => (
      <QueryClientProvider client={queryClient}>
        <HookBridge
          variables={variables}
          onReady={(v) => {
            hookRef.current = v;
          }}
        />
      </QueryClientProvider>
    );

    const { rerender } = render(ui({ latitude: 35 }));
    await waitFor(() => {
      expect(hookRef.current?.data).toEqual({ stations: [1] });
    });

    rerender(ui({ latitude: 36 }));
    await waitFor(() => {
      expect(hookRef.current?.data).toEqual({ stations: [2] });
    });
    expect(mockGqlRequest).toHaveBeenCalledTimes(2);
  });

  it('エラー時は error を返す', async () => {
    mockGqlRequest.mockRejectedValue(new Error('failed'));
    const hookRef: { current: HookResult } = { current: null };

    render(
      <QueryClientProvider client={createQueryClient()}>
        <HookBridge
          variables={{ latitude: 35 }}
          onReady={(v) => {
            hookRef.current = v;
          }}
        />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(hookRef.current?.error?.message).toBe('failed');
    });
    expect(hookRef.current?.loading).toBe(false);
  });
});
