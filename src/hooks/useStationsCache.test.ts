import { renderHook } from '@testing-library/react-native';
import { useSetAtom } from 'jotai';
import type { Station } from '~/@types/graphql';
import { gqlClient } from '~/lib/gql';
import { createStation } from '~/utils/test/factories';
import { useStationsCache } from './useStationsCache';

jest.mock('jotai', () => ({
  useSetAtom: jest.fn(),
  atom: jest.fn(),
}));

jest.mock('~/lib/gql', () => ({
  gqlClient: { query: jest.fn() },
}));

jest.mock('~/lib/graphql/queries', () => ({
  GET_LINE_LIST_STATIONS_LIGHT: 'GET_LINE_LIST_STATIONS_LIGHT',
}));

describe('useStationsCache', () => {
  const mockSetStationState = jest.fn();
  const mockQuery = gqlClient.query as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    (useSetAtom as unknown as jest.Mock).mockReturnValue(mockSetStationState);
  });

  it('station が null のときは何もしない', () => {
    renderHook(() => useStationsCache(null));

    expect(mockQuery).not.toHaveBeenCalled();
    expect(mockSetStationState).not.toHaveBeenCalled();
  });

  it('station の lines が空のときは query を呼ばない', async () => {
    const station = createStation(1, { lines: [] });

    renderHook(() => useStationsCache(station));

    // useEffect は非同期だが、lineIds.length === 0 で即 return するため query は呼ばれない
    await new Promise((r) => setTimeout(r, 0));
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('station の全路線の駅を取得して stationsCache を更新する', async () => {
    const lineAStations = [
      createStation(10, { line: { id: 100 } }),
      createStation(11, { line: { id: 100 } }),
    ];
    const lineBStations = [createStation(20, { line: { id: 200 } })];

    mockQuery.mockResolvedValue({
      data: {
        lineListStations: [...lineAStations, ...lineBStations],
      },
    });

    const station = createStation(1, {
      lines: [
        { __typename: 'LineNested', id: 100 },
        { __typename: 'LineNested', id: 200 },
      ] as Station['lines'],
    } as Parameters<typeof createStation>[1]);

    renderHook(() => useStationsCache(station));

    await new Promise((r) => setTimeout(r, 0));

    expect(mockQuery).toHaveBeenCalledWith({
      query: 'GET_LINE_LIST_STATIONS_LIGHT',
      variables: { lineIds: [100, 200] },
    });

    expect(mockSetStationState).toHaveBeenCalledWith(expect.any(Function));
    const updater = mockSetStationState.mock.calls[0][0];
    const result = updater({ stationsCache: [] });
    expect(result.stationsCache).toHaveLength(2);
    expect(result.stationsCache[0]).toEqual(lineAStations);
    expect(result.stationsCache[1]).toEqual(lineBStations);
  });

  it('query がエラーの場合は stationsCache を更新しない', async () => {
    mockQuery.mockRejectedValue(new Error('network error'));

    const station = createStation(1, {
      lines: [{ __typename: 'LineNested', id: 100 }] as Station['lines'],
    } as Parameters<typeof createStation>[1]);

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    renderHook(() => useStationsCache(station));

    await new Promise((r) => setTimeout(r, 0));

    expect(mockSetStationState).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
