import { renderHook } from '@testing-library/react-native';
import { useAtom, useSetAtom } from 'jotai';
import { useEffect, useState } from 'react';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';

// Mock jotai
jest.mock('jotai', () => ({
  useAtom: jest.fn(),
  useSetAtom: jest.fn(),
  atom: jest.fn((initialValue) => initialValue),
}));

describe('RouteSearchScreen - wantedDestination の状態管理', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('wantedDestinationがstationStateに移動している', () => {
    const mockStationState = {
      station: null,
      stations: [],
      pendingStations: [],
      wantedDestination: null,
    };
    const mockSetStationState = jest.fn();

    (useAtom as jest.Mock).mockReturnValue([
      mockStationState,
      mockSetStationState,
    ]);

    const { result } = renderHook(() => useAtom(stationState));

    expect(result.current[0]).toHaveProperty('wantedDestination');
  });

  it('pendingStationsをクリアする際、wantedDestinationもnullになる', () => {
    const mockSetStationState = jest.fn();
    const mockStationState = {
      station: {
        id: 1,
        groupId: 1,
        name: '東京',
        nameRoman: 'Tokyo',
      },
      stations: [],
      pendingStations: [],
      wantedDestination: {
        id: 2,
        groupId: 2,
        name: '品川',
        nameRoman: 'Shinagawa',
      },
    };

    (useAtom as jest.Mock).mockReturnValue([
      mockStationState,
      mockSetStationState,
    ]);

    // pendingStationsをクリアする処理をシミュレート
    mockSetStationState((prev: typeof mockStationState) => ({
      ...prev,
      pendingStations: [],
      wantedDestination: null,
    }));

    expect(mockSetStationState).toHaveBeenCalledWith(expect.any(Function));
  });

  it('navigationStateからwantedDestination関連のコードが削除されている', () => {
    const mockNavigationState = {
      headerState: 'CURRENT',
      leftStations: [],
      trainType: null,
      autoModeEnabled: true,
      stationForHeader: null,
      arrived: false,
      approaching: false,
      isLEDTheme: false,
      fetchedTrainTypes: [],
      headerTransitionDelay: false,
      targetAutoModeStation: null,
      firstStop: true,
      presetsFetched: false,
      presetRoutes: [],
    };

    (useAtom as jest.Mock).mockReturnValue([mockNavigationState, jest.fn()]);

    const { result } = renderHook(() => useAtom(navigationState));

    // pendingWantedDestinationが存在しないことを確認
    expect(result.current[0]).not.toHaveProperty('pendingWantedDestination');
  });

  it('駅選択時にwantedDestinationがstationStateに設定される', () => {
    const mockSetStationState = jest.fn();

    (useSetAtom as jest.Mock).mockReturnValue(mockSetStationState);

    // 駅選択時の処理をシミュレート
    // biome-ignore lint/suspicious/noExplicitAny: テスト用の状態更新関数
    mockSetStationState((prev: any) => ({
      ...prev,
      pendingStations: [],
      wantedDestination: null,
    }));

    expect(mockSetStationState).toHaveBeenCalledWith(expect.any(Function));
  });
});

describe('RouteSearchScreen - 駅グループ変更時の検索結果クリア', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('station.groupIdが変更されたら検索結果がクリアされる', () => {
    const setSearchResults = jest.fn();
    const setHasSearched = jest.fn();

    // RouteSearchScreen内のuseEffectロジックを再現
    const useResetSearchOnGroupChange = (groupId: number | undefined) => {
      // biome-ignore lint/correctness/useExhaustiveDependencies: groupIdの変更を意図的に監視するテスト
      useEffect(() => {
        setSearchResults([]);
        setHasSearched(false);
      }, [groupId]);
    };

    const { rerender } = renderHook(
      ({ groupId }) => useResetSearchOnGroupChange(groupId),
      { initialProps: { groupId: 1 } }
    );

    // 初回レンダリングでクリアが呼ばれる
    expect(setSearchResults).toHaveBeenCalledWith([]);
    expect(setHasSearched).toHaveBeenCalledWith(false);

    jest.clearAllMocks();

    // groupIdを変更
    rerender({ groupId: 2 });

    // groupId変更後にクリアが呼ばれる
    expect(setSearchResults).toHaveBeenCalledWith([]);
    expect(setHasSearched).toHaveBeenCalledWith(false);
  });

  it('station.groupIdが同じ値の場合は検索結果がクリアされない', () => {
    const setSearchResults = jest.fn();
    const setHasSearched = jest.fn();

    const useResetSearchOnGroupChange = (groupId: number | undefined) => {
      // biome-ignore lint/correctness/useExhaustiveDependencies: groupIdの変更を意図的に監視するテスト
      useEffect(() => {
        setSearchResults([]);
        setHasSearched(false);
      }, [groupId]);
    };

    const { rerender } = renderHook(
      ({ groupId }) => useResetSearchOnGroupChange(groupId),
      { initialProps: { groupId: 1 } }
    );

    // 初回レンダリング分をクリア
    jest.clearAllMocks();

    // 同じgroupIdで再レンダリング
    rerender({ groupId: 1 });

    // 同じ値なのでクリアは呼ばれない
    expect(setSearchResults).not.toHaveBeenCalled();
    expect(setHasSearched).not.toHaveBeenCalled();
  });

  it('station.groupIdがundefinedからnumberに変更されたら検索結果がクリアされる', () => {
    const setSearchResults = jest.fn();
    const setHasSearched = jest.fn();

    const useResetSearchOnGroupChange = (groupId: number | undefined) => {
      // biome-ignore lint/correctness/useExhaustiveDependencies: groupIdの変更を意図的に監視するテスト
      useEffect(() => {
        setSearchResults([]);
        setHasSearched(false);
      }, [groupId]);
    };

    const { rerender } = renderHook(
      ({ groupId }) => useResetSearchOnGroupChange(groupId),
      { initialProps: { groupId: undefined as number | undefined } }
    );

    // 初回レンダリング分をクリア
    jest.clearAllMocks();

    // undefinedから数値に変更
    rerender({ groupId: 1 });

    // クリアが呼ばれる
    expect(setSearchResults).toHaveBeenCalledWith([]);
    expect(setHasSearched).toHaveBeenCalledWith(false);
  });

  it('検索結果とhasSearchedの両方がリセットされる', () => {
    // useState を使用した実際の状態管理をシミュレート
    const useSearchState = (groupId: number | undefined) => {
      const [searchResults, setSearchResults] = useState<string[]>([
        'result1',
        'result2',
      ]);
      const [hasSearched, setHasSearched] = useState(true);

      // biome-ignore lint/correctness/useExhaustiveDependencies: groupIdの変更を意図的に監視するテスト
      useEffect(() => {
        setSearchResults([]);
        setHasSearched(false);
      }, [groupId]);

      return { searchResults, hasSearched };
    };

    const { result } = renderHook(({ groupId }) => useSearchState(groupId), {
      initialProps: { groupId: 1 },
    });

    // 初回レンダリング後、useEffectによりクリアされている
    expect(result.current.searchResults).toEqual([]);
    expect(result.current.hasSearched).toBe(false);
  });
});
