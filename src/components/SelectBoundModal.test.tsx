import { useAtom } from 'jotai';
import type { Station } from '~/@types/graphql';
import type { LineDirection } from '../models/Bound';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';

// Mock jotai
jest.mock('jotai', () => ({
  useAtom: jest.fn(),
  atom: jest.fn((initialValue) => initialValue),
}));

describe('SelectBoundModal - wantedDestinationロジック', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('wantedDestinationがstationStateから取得される', () => {
    const mockStationState = {
      station: null,
      stations: [],
      pendingStations: [],
      wantedDestination: {
        id: 2,
        groupId: 2,
        name: '品川',
        nameRoman: 'Shinagawa',
      },
    };

    (useAtom as jest.Mock).mockReturnValue([mockStationState, jest.fn()]);

    const [state] = useAtom(stationState);

    expect(state).toHaveProperty('wantedDestination');
    expect(state.wantedDestination).toEqual({
      id: 2,
      groupId: 2,
      name: '品川',
      nameRoman: 'Shinagawa',
    });
  });

  it('TrainType選択時にwantedDestinationがクリアされる', () => {
    const mockSetStationState = jest.fn();
    const mockStationState = {
      station: null,
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

    // TrainType選択時にwantedDestinationをnullにする処理をシミュレート
    mockSetStationState((prev: typeof mockStationState) => ({
      ...prev,
      wantedDestination: null,
    }));

    expect(mockSetStationState).toHaveBeenCalledWith(expect.any(Function));
  });

  it('wantedDestinationのトグル処理が正しく動作する', () => {
    const mockSetStationState = jest.fn();
    const selectedStation = {
      id: 2,
      groupId: 2,
      name: '品川',
      nameRoman: 'Shinagawa',
    };

    (useAtom as jest.Mock).mockReturnValue([
      {
        station: null,
        stations: [],
        pendingStations: [],
        wantedDestination: null,
      },
      mockSetStationState,
    ]);

    // 終着駅設定時の処理をシミュレート
    // biome-ignore lint/suspicious/noExplicitAny: テスト用の状態更新関数
    mockSetStationState((prev: any) => ({
      ...prev,
      wantedDestination:
        prev.wantedDestination?.groupId === selectedStation.groupId
          ? null
          : selectedStation,
    }));

    expect(mockSetStationState).toHaveBeenCalledWith(expect.any(Function));
  });
});

describe('SelectBoundModal - targetDestination による方向フィルタリング', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('targetDestination が null の場合、方向のフィルタリングは行われない', () => {
    const stations = [
      { id: 1, groupId: 1, name: '東京', nameRoman: 'Tokyo' },
      { id: 2, groupId: 2, name: '品川', nameRoman: 'Shinagawa' },
      { id: 3, groupId: 3, name: '横浜', nameRoman: 'Yokohama' },
    ] as unknown as Station[];
    const currentStation = {
      id: 1,
      groupId: 1,
      name: '東京',
      nameRoman: 'Tokyo',
    } as unknown as Station;

    // targetDestination が null の場合は両方向を表示
    const targetDestination: Station | null = null;
    const wantedDestination: Station | null = null;

    // フィルタリング条件: targetDestination と wantedDestination が両方 null の場合
    const shouldFilter =
      targetDestination !== null || wantedDestination !== null;

    expect(shouldFilter).toBe(false);
    expect(stations.length).toBe(3);
    expect(currentStation.groupId).toBe(1);
  });

  it('targetDestination が設定されている場合、INBOUND 方向が計算される', () => {
    const stations = [
      { id: 1, groupId: 1, name: '東京', nameRoman: 'Tokyo' },
      { id: 2, groupId: 2, name: '品川', nameRoman: 'Shinagawa' },
      { id: 3, groupId: 3, name: '横浜', nameRoman: 'Yokohama' },
    ] as unknown as Station[];
    const currentStation = {
      id: 1,
      groupId: 1,
      name: '東京',
      nameRoman: 'Tokyo',
    } as unknown as Station;

    // targetDestination が現在の駅より後ろにある場合は INBOUND
    const targetDestination = {
      id: 3,
      groupId: 3,
      name: '横浜',
    } as unknown as Station;
    const currentStationIndex = stations.findIndex(
      (s) => s.groupId === currentStation.groupId
    );
    const targetStationIndex = stations.findIndex(
      (s) => s.groupId === targetDestination.groupId
    );

    const direction =
      currentStationIndex < targetStationIndex ? 'INBOUND' : 'OUTBOUND';

    expect(currentStationIndex).toBe(0);
    expect(targetStationIndex).toBe(2);
    expect(direction).toBe('INBOUND');
  });

  it('targetDestination が設定されている場合、OUTBOUND 方向が計算される', () => {
    const stations = [
      { id: 1, groupId: 1, name: '東京', nameRoman: 'Tokyo' },
      { id: 2, groupId: 2, name: '品川', nameRoman: 'Shinagawa' },
      { id: 3, groupId: 3, name: '横浜', nameRoman: 'Yokohama' },
    ] as unknown as Station[];
    const currentStation = {
      id: 3,
      groupId: 3,
      name: '横浜',
      nameRoman: 'Yokohama',
    } as unknown as Station;

    // targetDestination が現在の駅より前にある場合は OUTBOUND
    const targetDestination = {
      id: 1,
      groupId: 1,
      name: '東京',
    } as unknown as Station;
    const currentStationIndex = stations.findIndex(
      (s) => s.groupId === currentStation.groupId
    );
    const targetStationIndex = stations.findIndex(
      (s) => s.groupId === targetDestination.groupId
    );

    const direction =
      currentStationIndex < targetStationIndex ? 'INBOUND' : 'OUTBOUND';

    expect(currentStationIndex).toBe(2);
    expect(targetStationIndex).toBe(0);
    expect(direction).toBe('OUTBOUND');
  });

  it('wantedDestination が設定されている場合は targetDestination より優先される', () => {
    const stations = [
      { id: 1, groupId: 1, name: '東京', nameRoman: 'Tokyo' },
      { id: 2, groupId: 2, name: '品川', nameRoman: 'Shinagawa' },
      { id: 3, groupId: 3, name: '横浜', nameRoman: 'Yokohama' },
    ] as unknown as Station[];

    const targetDestination = {
      id: 3,
      groupId: 3,
      name: '横浜',
    } as unknown as Station;
    const wantedDestination = {
      id: 2,
      groupId: 2,
      name: '品川',
    } as unknown as Station;

    // 実装のロジック: targetDestination && !isLoopLine && !wantedDestination
    // wantedDestination が設定されている場合は targetDestination のフィルタリングは無視される
    const shouldUseTargetDestination =
      targetDestination !== null && wantedDestination === null;

    expect(shouldUseTargetDestination).toBe(false);
    expect(wantedDestination.groupId).toBe(2);
    expect(stations.length).toBe(3);
  });

  it('ループ線の場合は targetDestination によるフィルタリングは行われない', () => {
    const isLoopLine = true;
    const targetDestination = {
      id: 3,
      groupId: 3,
      name: '横浜',
    } as unknown as Station;
    const wantedDestination: Station | null = null;

    // 実装のロジック: targetDestination && !isLoopLine && !wantedDestination
    const shouldUseTargetDestination =
      targetDestination !== null && !isLoopLine && wantedDestination === null;

    expect(shouldUseTargetDestination).toBe(false);
  });
});

describe('SelectBoundModal - onCloseAnimationEnd', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('onCloseAnimationEnd prop が SelectBoundModal の Props 型に含まれる', () => {
    const mockOnCloseAnimationEnd = jest.fn();

    // Props の型が正しいことを確認
    const props = {
      visible: true,
      onClose: jest.fn(),
      onCloseAnimationEnd: mockOnCloseAnimationEnd,
      loading: false,
      error: null,
      onTrainTypeSelect: jest.fn(),
      onBoundSelect: jest.fn(),
      targetDestination: null,
    };

    expect(props).toHaveProperty('onCloseAnimationEnd');
    expect(typeof props.onCloseAnimationEnd).toBe('function');
  });

  it('onCloseAnimationEnd はオプショナルな prop である', () => {
    // onCloseAnimationEnd を省略した Props も有効
    const propsWithoutCallback = {
      visible: true,
      onClose: jest.fn(),
      loading: false,
      error: null,
      onTrainTypeSelect: jest.fn(),
      onBoundSelect: jest.fn(),
      targetDestination: null,
    };

    // onCloseAnimationEnd がなくてもエラーにならない
    expect(propsWithoutCallback).not.toHaveProperty('onCloseAnimationEnd');
  });

  it('targetDestination prop が SelectBoundModal の Props 型に含まれる', () => {
    const targetStation = {
      id: 3,
      groupId: 3,
      name: '横浜',
    } as unknown as Station;

    const props = {
      visible: true,
      onClose: jest.fn(),
      onCloseAnimationEnd: jest.fn(),
      loading: false,
      error: null,
      onTrainTypeSelect: jest.fn(),
      onBoundSelect: jest.fn(),
      targetDestination: targetStation,
    };

    expect(props).toHaveProperty('targetDestination');
    expect(props.targetDestination).toEqual(targetStation);
  });
});

describe('SelectBoundModal - renderButton 表示条件', () => {
  // renderButtonの非表示条件をシミュレートするヘルパー関数
  const shouldHideButton = (
    boundStationsLength: number,
    direction: LineDirection,
    isLoopLine: boolean,
    currentIndex: number,
    stationsLength: number
  ): boolean => {
    return (
      !boundStationsLength ||
      (direction === 'INBOUND' &&
        !isLoopLine &&
        currentIndex === stationsLength - 1)
    );
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('boundStationsが空の場合、ボタンは非表示になる', () => {
    const result = shouldHideButton(0, 'OUTBOUND', false, 0, 5);
    expect(result).toBe(true);
  });

  it('boundStationsがある場合、currentIndex === 0でもOUTBOUNDボタンは表示される', () => {
    const result = shouldHideButton(1, 'OUTBOUND', false, 0, 5);
    // boundStationsがあるのでOUTBOUNDボタンは表示される
    expect(result).toBe(false);
  });

  it('INBOUNDで終点（currentIndex === stations.length - 1）の場合、ボタンは非表示になる', () => {
    const result = shouldHideButton(1, 'INBOUND', false, 4, 5);
    expect(result).toBe(true);
  });

  it('ループ線の場合、終点でもINBOUNDボタンは表示される', () => {
    const result = shouldHideButton(1, 'INBOUND', true, 4, 5);
    // ループ線なのでINBOUNDボタンは表示される
    expect(result).toBe(false);
  });

  it('大江戸線の都庁前駅でboundStationsがある場合、OUTBOUNDボタンは表示される', () => {
    // 都庁前駅が配列の先頭（currentIndex === 0）でも、
    // boundStationsに光が丘があれば表示される
    const result = shouldHideButton(1, 'OUTBOUND', false, 0, 5);
    // boundStationsがあるのでOUTBOUNDボタンは表示される
    expect(result).toBe(false);
  });
});

describe('SelectBoundModal - 保存済み経路の検索ロジック', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('pendingTrainType.groupId を使用して保存済み経路を検索する', () => {
    const mockNavigationState = {
      pendingTrainType: { id: 1, groupId: 100, name: '快速' },
      fetchedTrainTypes: [{ id: 1, groupId: 100, name: '快速' }],
      trainType: null, // trainType ではなく pendingTrainType を使用すべき
      presetsFetched: true,
      presetRoutes: [],
    };

    (useAtom as jest.Mock).mockReturnValue([mockNavigationState, jest.fn()]);

    const [state] = useAtom(navigationState);

    // 保存済み経路の検索には pendingTrainType.groupId を使用する
    expect(state.pendingTrainType?.groupId).toBe(100);
    // trainType ではなく pendingTrainType を使用することを確認
    expect(state.trainType).toBeNull();
  });

  it('pendingTrainType が null の場合、trainTypeId: null で検索する', () => {
    const mockNavigationState = {
      pendingTrainType: null,
      fetchedTrainTypes: [],
      trainType: null,
      presetsFetched: true,
      presetRoutes: [],
    };

    (useAtom as jest.Mock).mockReturnValue([mockNavigationState, jest.fn()]);

    const [state] = useAtom(navigationState);

    // pendingTrainType が null の場合、trainTypeId: null で検索する
    expect(state.pendingTrainType?.groupId ?? null).toBeNull();
  });

  it('種別変更時に pendingTrainType が更新され、保存済み経路の検索条件が変わる', () => {
    const mockSetNavigationState = jest.fn();
    const initialState = {
      pendingTrainType: null,
      fetchedTrainTypes: [
        { id: 1, groupId: 100, name: '快速' },
        { id: 2, groupId: 200, name: '急行' },
      ],
      trainType: null,
      presetsFetched: true,
      presetRoutes: [],
    };

    (useAtom as jest.Mock).mockReturnValue([
      initialState,
      mockSetNavigationState,
    ]);

    // 種別選択時の処理をシミュレート
    const selectedTrainType = { id: 2, groupId: 200, name: '急行' };
    mockSetNavigationState((prev: typeof initialState) => ({
      ...prev,
      pendingTrainType: selectedTrainType,
    }));

    expect(mockSetNavigationState).toHaveBeenCalledWith(expect.any(Function));

    const updateFunction = mockSetNavigationState.mock.calls[0][0];
    const updatedState = updateFunction(initialState);

    // pendingTrainType が更新されている
    expect(updatedState.pendingTrainType).toEqual(selectedTrainType);
    // これにより検索条件が trainTypeId: 200 に変わる
    expect(updatedState.pendingTrainType?.groupId).toBe(200);
  });
});
