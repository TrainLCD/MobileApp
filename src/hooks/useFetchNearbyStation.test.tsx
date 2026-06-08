import { useLazyQuery } from '@apollo/client/react';
import { act, render } from '@testing-library/react-native';
import type React from 'react';
import type { Station } from '~/@types/graphql';
import { TransportType } from '~/@types/graphql';
import { createStation } from '~/utils/test/factories';
import { useFetchNearbyStation } from './useFetchNearbyStation';

jest.mock('@apollo/client/react', () => ({
  useLazyQuery: jest.fn(),
}));

type HookResult = ReturnType<typeof useFetchNearbyStation> | null;

const HookBridge: React.FC<{ onReady: (value: HookResult) => void }> = ({
  onReady,
}) => {
  onReady(useFetchNearbyStation());
  return null;
};

describe('useFetchNearbyStation', () => {
  const mockUseLazyQuery = useLazyQuery as unknown as jest.Mock;

  const setupQuery = ({
    loading = false,
    error,
    data,
  }: {
    loading?: boolean;
    error?: Error;
    data?: { stationsNearby: Station[] };
  } = {}) => {
    const mockFetchStationsNearby = jest.fn();
    mockUseLazyQuery.mockReturnValue([
      mockFetchStationsNearby,
      { data, error, loading },
    ]);
    return { mockFetchStationsNearby };
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('transportType を指定せずに fetchByCoords を呼び出せる', async () => {
    const { mockFetchStationsNearby } = setupQuery();
    mockFetchStationsNearby.mockResolvedValue({
      data: { stationsNearby: [createStation(1)] },
    });

    const hookRef: { current: HookResult } = { current: null };
    const handleReady = (value: HookResult) => {
      hookRef.current = value;
    };
    render(<HookBridge onReady={handleReady} />);

    await act(async () => {
      await hookRef.current?.fetchByCoords({
        latitude: 35.681236,
        longitude: 139.767125,
        limit: 1,
      });
    });

    expect(mockFetchStationsNearby).toHaveBeenCalledWith({
      variables: {
        latitude: 35.681236,
        longitude: 139.767125,
        limit: 1,
      },
    });
  });

  it('transportType に Rail を指定して fetchByCoords を呼び出せる', async () => {
    const { mockFetchStationsNearby } = setupQuery();
    mockFetchStationsNearby.mockResolvedValue({
      data: { stationsNearby: [createStation(1)] },
    });

    const hookRef: { current: HookResult } = { current: null };
    const handleReady = (value: HookResult) => {
      hookRef.current = value;
    };
    render(<HookBridge onReady={handleReady} />);

    await act(async () => {
      await hookRef.current?.fetchByCoords({
        latitude: 35.681236,
        longitude: 139.767125,
        limit: 1,
        transportType: TransportType.Rail,
      });
    });

    expect(mockFetchStationsNearby).toHaveBeenCalledWith({
      variables: {
        latitude: 35.681236,
        longitude: 139.767125,
        limit: 1,
        transportType: TransportType.Rail,
      },
    });
  });

  it('transportType に Bus を指定して fetchByCoords を呼び出せる', async () => {
    const { mockFetchStationsNearby } = setupQuery();
    mockFetchStationsNearby.mockResolvedValue({
      data: { stationsNearby: [createStation(1)] },
    });

    const hookRef: { current: HookResult } = { current: null };
    const handleReady = (value: HookResult) => {
      hookRef.current = value;
    };
    render(<HookBridge onReady={handleReady} />);

    await act(async () => {
      await hookRef.current?.fetchByCoords({
        latitude: 35.681236,
        longitude: 139.767125,
        limit: 1,
        transportType: TransportType.Bus,
      });
    });

    expect(mockFetchStationsNearby).toHaveBeenCalledWith({
      variables: {
        latitude: 35.681236,
        longitude: 139.767125,
        limit: 1,
        transportType: TransportType.Bus,
      },
    });
  });

  it('stations が null を除外して返される', () => {
    const stations = [createStation(1), null, createStation(2)] as Station[];
    setupQuery({ data: { stationsNearby: stations } });

    const hookRef: { current: HookResult } = { current: null };
    const handleReady = (value: HookResult) => {
      hookRef.current = value;
    };
    render(<HookBridge onReady={handleReady} />);

    expect(hookRef.current?.stations).toHaveLength(2);
    expect(hookRef.current?.stations[0]?.id).toBe(1);
    expect(hookRef.current?.stations[1]?.id).toBe(2);
  });

  it('データがない場合は空配列を返す', () => {
    setupQuery();

    const hookRef: { current: HookResult } = { current: null };
    const handleReady = (value: HookResult) => {
      hookRef.current = value;
    };
    render(<HookBridge onReady={handleReady} />);

    expect(hookRef.current?.stations).toEqual([]);
  });

  it('isLoading フラグを返す', () => {
    setupQuery({ loading: true });

    const hookRef: { current: HookResult } = { current: null };
    const handleReady = (value: HookResult) => {
      hookRef.current = value;
    };
    render(<HookBridge onReady={handleReady} />);

    expect(hookRef.current?.isLoading).toBe(true);
  });

  it('error を返す', () => {
    const error = new Error('Network error');
    setupQuery({ error });

    const hookRef: { current: HookResult } = { current: null };
    const handleReady = (value: HookResult) => {
      hookRef.current = value;
    };
    render(<HookBridge onReady={handleReady} />);

    expect(hookRef.current?.error?.message).toBe('Network error');
  });
});
