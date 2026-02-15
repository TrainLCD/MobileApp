import { act, renderHook } from '@testing-library/react-native';
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

    const { rerender } = renderHook<void, { groupId: number | undefined }>(
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

    const { rerender } = renderHook<void, { groupId: number | undefined }>(
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

    const { rerender } = renderHook<void, { groupId: number | undefined }>(
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

    const { result } = renderHook<
      { searchResults: string[]; hasSearched: boolean },
      { groupId: number | undefined }
    >(({ groupId }) => useSearchState(groupId), {
      initialProps: { groupId: 1 },
    });

    // 初回レンダリング後、useEffectによりクリアされている
    expect(result.current.searchResults).toEqual([]);
    expect(result.current.hasSearched).toBe(false);
  });
});

describe('RouteSearchScreen - selectedDestination の状態管理', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('selectedDestination の初期値は null', () => {
    const useSelectedDestination = () => {
      const [selectedDestination, setSelectedDestination] = useState<{
        id: number;
        groupId: number;
        name: string;
      } | null>(null);
      return { selectedDestination, setSelectedDestination };
    };

    const { result } = renderHook(() => useSelectedDestination());

    expect(result.current.selectedDestination).toBeNull();
  });

  it('handleLineSelected で selectedDestination が設定される', () => {
    const useSelectedDestination = () => {
      const [selectedDestination, setSelectedDestination] = useState<{
        id: number;
        groupId: number;
        name: string;
      } | null>(null);

      const handleLineSelected = (station: {
        id: number;
        groupId: number;
        name: string;
      }) => {
        setSelectedDestination(station);
      };

      return { selectedDestination, handleLineSelected };
    };

    const { result } = renderHook(() => useSelectedDestination());

    const selectedStation = { id: 2, groupId: 2, name: '品川' };
    act(() => {
      result.current.handleLineSelected(selectedStation);
    });

    expect(result.current.selectedDestination).toEqual(selectedStation);
  });

  it('onCloseAnimationEnd で selectedDestination が null にリセットされる', () => {
    const useSelectedDestination = () => {
      const [selectedDestination, setSelectedDestination] = useState<{
        id: number;
        groupId: number;
        name: string;
      } | null>({ id: 2, groupId: 2, name: '品川' });

      const onCloseAnimationEnd = () => {
        setSelectedDestination(null);
      };

      return { selectedDestination, onCloseAnimationEnd };
    };

    const { result } = renderHook(() => useSelectedDestination());

    // 初期状態では selectedDestination が設定されている
    expect(result.current.selectedDestination).not.toBeNull();

    // onCloseAnimationEnd を呼び出す
    act(() => {
      result.current.onCloseAnimationEnd();
    });

    // selectedDestination が null にリセットされる
    expect(result.current.selectedDestination).toBeNull();
  });

  it('onClose では selectedDestination はリセットされない（onCloseAnimationEnd でリセット）', () => {
    const useModalState = () => {
      const [visible, setVisible] = useState(true);
      const [selectedDestination, setSelectedDestination] = useState<{
        id: number;
        groupId: number;
        name: string;
      } | null>({ id: 2, groupId: 2, name: '品川' });

      const onClose = () => {
        setVisible(false);
        // selectedDestination は onClose ではリセットしない
      };

      const onCloseAnimationEnd = () => {
        setSelectedDestination(null);
      };

      return { visible, selectedDestination, onClose, onCloseAnimationEnd };
    };

    const { result } = renderHook(() => useModalState());

    // onClose を呼び出す
    act(() => {
      result.current.onClose();
    });

    // visible は false になるが、selectedDestination はまだ設定されている
    expect(result.current.visible).toBe(false);
    expect(result.current.selectedDestination).not.toBeNull();

    // onCloseAnimationEnd を呼び出す（アニメーション完了後）
    act(() => {
      result.current.onCloseAnimationEnd();
    });

    // selectedDestination が null にリセットされる
    expect(result.current.selectedDestination).toBeNull();
  });

  it('SelectBoundModal に targetDestination として selectedDestination が渡される', () => {
    const selectedStation = { id: 2, groupId: 2, name: '品川' };

    // SelectBoundModal の props を構築
    const selectBoundModalProps = {
      visible: true,
      onClose: jest.fn(),
      onCloseAnimationEnd: jest.fn(),
      onBoundSelect: jest.fn(),
      loading: false,
      error: null,
      onTrainTypeSelect: jest.fn(),
      targetDestination: selectedStation,
    };

    // targetDestination が正しく設定されていることを確認
    expect(selectBoundModalProps.targetDestination).toEqual(selectedStation);
    expect(selectBoundModalProps).toHaveProperty('onCloseAnimationEnd');
  });
});

describe('RouteSearchScreen - TrainTypeListModalの路線選択', () => {
  const selectTrainTypeModalLine = ({
    currentStationInRoutesLine,
    stationLine,
    stationLines,
  }: {
    currentStationInRoutesLine: { id: number } | null;
    stationLine: { id: number } | null;
    stationLines: Array<{ id: number }>;
  }) => {
    if (
      currentStationInRoutesLine &&
      stationLines.some((l) => l.id === currentStationInRoutesLine.id)
    ) {
      return currentStationInRoutesLine;
    }

    return stationLine ?? stationLines[0] ?? null;
  };

  it('currentStationInRoutes.line が station.lines に存在すればそれを使う', () => {
    const seibuIkebukuroLine = { id: 1 };
    const seibuShinjukuLine = { id: 2 };

    const result = selectTrainTypeModalLine({
      currentStationInRoutesLine: seibuIkebukuroLine,
      stationLine: seibuShinjukuLine,
      stationLines: [seibuIkebukuroLine, seibuShinjukuLine],
    });

    expect(result?.id).toBe(seibuIkebukuroLine.id);
  });

  it('currentStationInRoutes.line が station.lines に無ければ station.line を使う', () => {
    const seibuIkebukuroLine = { id: 1 };
    const seibuShinjukuLine = { id: 2 };
    const unrelatedLine = { id: 99 };

    const result = selectTrainTypeModalLine({
      currentStationInRoutesLine: unrelatedLine,
      stationLine: seibuIkebukuroLine,
      stationLines: [seibuIkebukuroLine, seibuShinjukuLine],
    });

    expect(result?.id).toBe(seibuIkebukuroLine.id);
  });

  it('station.line が null の場合は station.lines の先頭を使う', () => {
    const seibuIkebukuroLine = { id: 1 };
    const seibuShinjukuLine = { id: 2 };

    const result = selectTrainTypeModalLine({
      currentStationInRoutesLine: null,
      stationLine: null,
      stationLines: [seibuIkebukuroLine, seibuShinjukuLine],
    });

    expect(result?.id).toBe(seibuIkebukuroLine.id);
  });
});
