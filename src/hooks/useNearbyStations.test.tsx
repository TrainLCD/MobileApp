import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { type ReactNode, StrictMode } from 'react';
import { TOEI_SHINJUKU_LINE_STATIONS } from '~/__fixtures__/station';
import { gqlRequest } from '~/lib/gql';
import { useNearbyStations } from './useNearbyStations';

jest.mock('~/lib/gql', () => ({
  gqlRequest: jest.fn(),
  graphqlQueryKey: (_document: unknown, variables: object) => [
    'Nearby',
    variables,
  ],
}));

const mockRequest = jest.mocked(gqlRequest);
const first = TOEI_SHINJUKU_LINE_STATIONS[0];
const second = TOEI_SHINJUKU_LINE_STATIONS[1];
const initialProps = { latitude: 35, longitude: 139, visible: true };
const clients: QueryClient[] = [];
const setup = (props = initialProps) => {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Number.POSITIVE_INFINITY,
        gcTime: Number.POSITIVE_INFINITY,
      },
    },
  });
  clients.push(client);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <StrictMode>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </StrictMode>
  );
  return {
    client,
    ...renderHook(useNearbyStations, { wrapper, initialProps: props }),
  };
};

afterEach(() => {
  for (const client of clients.splice(0)) client.clear();
  jest.clearAllMocks();
});

it('API の並びと重複行を保持し、再表示ではキャッシュを再利用する', async () => {
  mockRequest.mockResolvedValue({ stationsNearby: [second, first, second] });
  const { client, result, rerender } = setup();
  await waitFor(() =>
    expect(result.current.data?.stationsNearby).toEqual([second, first, second])
  );
  expect(result.current.loading).toBe(false);
  expect(mockRequest).toHaveBeenCalledTimes(1);
  rerender({ ...initialProps, visible: false });
  expect(result.current.data).toBeUndefined();
  expect(result.current.loading).toBe(false);
  await waitFor(() =>
    expect(client.getQueryCache().getAll()[0]?.getObserversCount()).toBe(1)
  );
  rerender(initialProps);
  await waitFor(() =>
    expect(result.current.data?.stationsNearby).toHaveLength(3)
  );
  expect(mockRequest).toHaveBeenCalledTimes(1);
});

it('閉じている間は取得せず、開いたときに取得する', async () => {
  mockRequest.mockResolvedValue({ stationsNearby: [] });
  const { result, rerender } = setup({ ...initialProps, visible: false });
  expect(mockRequest).not.toHaveBeenCalled();
  expect(result.current.loading).toBe(false);
  rerender(initialProps);
  await waitFor(() => expect(result.current.data?.stationsNearby).toEqual([]));
  expect(result.current.loading).toBe(false);
});

it('座標がないときは取得せず、緯度経度 0 は有効として扱う', async () => {
  mockRequest.mockResolvedValue({ stationsNearby: [] });
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Number.POSITIVE_INFINITY },
    },
  });
  clients.push(client);
  const { result, rerender } = renderHook(useNearbyStations, {
    initialProps: {
      latitude: undefined as number | undefined,
      longitude: 0,
      visible: true,
    },
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
  expect(mockRequest).not.toHaveBeenCalled();
  expect(result.current.loading).toBe(false);
  rerender({ latitude: 0, longitude: 0, visible: true });
  await waitFor(() => expect(result.current.data?.stationsNearby).toEqual([]));
  expect(mockRequest).toHaveBeenCalledWith(expect.anything(), {
    latitude: 0,
    longitude: 0,
    limit: 10,
  });
});

it('座標を変更した後に古い応答が届いても最新の一覧を保つ', async () => {
  let resolveOld!: (data: { stationsNearby: (typeof first)[] }) => void;
  mockRequest.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveOld = resolve;
      })
  );
  mockRequest.mockResolvedValueOnce({ stationsNearby: [second] });
  const { result, rerender } = setup();
  expect(result.current.loading).toBe(true);
  rerender({ ...initialProps, latitude: 36 });
  await waitFor(() =>
    expect(result.current.data?.stationsNearby).toEqual([second])
  );
  await act(async () => resolveOld({ stationsNearby: [first] }));
  expect(result.current.data?.stationsNearby).toEqual([second]);
});

it('通信失敗を通知し、再取得成功後にエラーを解消する', async () => {
  mockRequest.mockRejectedValueOnce(new Error('offline'));
  const { client, result } = setup();
  await waitFor(() => expect(result.current.error?.message).toBe('offline'));
  expect(result.current.loading).toBe(false);
  mockRequest.mockResolvedValueOnce({ stationsNearby: [first] });
  await act(async () => {
    await client.refetchQueries({ queryKey: ['Nearby'] });
  });
  await waitFor(() =>
    expect(result.current.data?.stationsNearby).toEqual([first])
  );
  expect(result.current.error).toBeUndefined();
});

it('共有キャッシュの更新をライブクエリへ反映する', async () => {
  mockRequest.mockResolvedValue({ stationsNearby: [first] });
  const { client, result } = setup();
  await waitFor(() =>
    expect(result.current.data?.stationsNearby).toEqual([first])
  );
  act(() => {
    client.setQueryData(
      ['Nearby', { latitude: 35, longitude: 139, limit: 10 }],
      { stationsNearby: [second, first] }
    );
  });
  await waitFor(() =>
    expect(result.current.data?.stationsNearby).toEqual([second, first])
  );
});

// Hermes のように Web Crypto がない実行環境でも、読み取り経路で UUID 生成を要求しない。
it('Web Crypto がなくても一覧を読み取れる', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  Object.defineProperty(globalThis, 'crypto', {
    value: undefined,
    configurable: true,
  });
  try {
    mockRequest.mockResolvedValue({ stationsNearby: [first] });
    const { result, unmount } = setup();
    await waitFor(() =>
      expect(result.current.data?.stationsNearby).toEqual([first])
    );
    unmount();
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'crypto', descriptor);
    else Reflect.deleteProperty(globalThis, 'crypto');
  }
});

it('以前の座標へ戻るとキャッシュから一覧を復元する', async () => {
  mockRequest.mockResolvedValueOnce({ stationsNearby: [first] });
  mockRequest.mockResolvedValueOnce({ stationsNearby: [second] });
  const { result, rerender } = setup();
  await waitFor(() =>
    expect(result.current.data?.stationsNearby).toEqual([first])
  );
  rerender({ ...initialProps, latitude: 36 });
  await waitFor(() =>
    expect(result.current.data?.stationsNearby).toEqual([second])
  );
  rerender(initialProps);
  await waitFor(() =>
    expect(result.current.data?.stationsNearby).toEqual([first])
  );
  expect(mockRequest).toHaveBeenCalledTimes(2);
});
