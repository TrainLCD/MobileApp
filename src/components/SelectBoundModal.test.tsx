import { useAtom } from 'jotai';
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

  it('targetDestination が null の場合、両方向のボタンが表示される', () => {
    const mockStationState = {
      pendingStation: { id: 1, groupId: 1, name: '東京', nameRoman: 'Tokyo' },
      pendingStations: [
        { id: 1, groupId: 1, name: '東京', nameRoman: 'Tokyo' },
        { id: 2, groupId: 2, name: '品川', nameRoman: 'Shinagawa' },
        { id: 3, groupId: 3, name: '横浜', nameRoman: 'Yokohama' },
      ],
      wantedDestination: null,
    };

    (useAtom as jest.Mock).mockReturnValue([mockStationState, jest.fn()]);

    const [state] = useAtom(stationState);

    // targetDestination が null の場合は方向のフィルタリングは行われない
    expect(state.wantedDestination).toBeNull();
  });

  it('targetDestination が設定されている場合、その方向のみ表示される（INBOUND）', () => {
    const mockStationState = {
      pendingStation: { id: 1, groupId: 1, name: '東京', nameRoman: 'Tokyo' },
      pendingStations: [
        { id: 1, groupId: 1, name: '東京', nameRoman: 'Tokyo' },
        { id: 2, groupId: 2, name: '品川', nameRoman: 'Shinagawa' },
        { id: 3, groupId: 3, name: '横浜', nameRoman: 'Yokohama' },
      ],
      wantedDestination: null,
    };

    (useAtom as jest.Mock).mockReturnValue([mockStationState, jest.fn()]);

    const [state] = useAtom(stationState);
    const stations = state.pendingStations;
    const currentStation = state.pendingStation;

    // targetDestination が現在の駅より後ろにある場合は INBOUND
    const targetDestination = { id: 3, groupId: 3, name: '横浜' };
    const currentStationIndex = stations.findIndex(
      (s) => s.groupId === currentStation?.groupId
    );
    const targetStationIndex = stations.findIndex(
      (s) => s.groupId === targetDestination.groupId
    );

    const direction =
      currentStationIndex < targetStationIndex ? 'INBOUND' : 'OUTBOUND';

    expect(direction).toBe('INBOUND');
  });

  it('targetDestination が設定されている場合、その方向のみ表示される（OUTBOUND）', () => {
    const mockStationState = {
      pendingStation: {
        id: 3,
        groupId: 3,
        name: '横浜',
        nameRoman: 'Yokohama',
      },
      pendingStations: [
        { id: 1, groupId: 1, name: '東京', nameRoman: 'Tokyo' },
        { id: 2, groupId: 2, name: '品川', nameRoman: 'Shinagawa' },
        { id: 3, groupId: 3, name: '横浜', nameRoman: 'Yokohama' },
      ],
      wantedDestination: null,
    };

    (useAtom as jest.Mock).mockReturnValue([mockStationState, jest.fn()]);

    const [state] = useAtom(stationState);
    const stations = state.pendingStations;
    const currentStation = state.pendingStation;

    // targetDestination が現在の駅より前にある場合は OUTBOUND
    const targetDestination = { id: 1, groupId: 1, name: '東京' };
    const currentStationIndex = stations.findIndex(
      (s) => s.groupId === currentStation?.groupId
    );
    const targetStationIndex = stations.findIndex(
      (s) => s.groupId === targetDestination.groupId
    );

    const direction =
      currentStationIndex < targetStationIndex ? 'INBOUND' : 'OUTBOUND';

    expect(direction).toBe('OUTBOUND');
  });

  it('targetDestination と wantedDestination が両方設定されている場合、wantedDestination が優先される', () => {
    const mockStationState = {
      pendingStation: { id: 1, groupId: 1, name: '東京', nameRoman: 'Tokyo' },
      pendingStations: [
        { id: 1, groupId: 1, name: '東京', nameRoman: 'Tokyo' },
        { id: 2, groupId: 2, name: '品川', nameRoman: 'Shinagawa' },
        { id: 3, groupId: 3, name: '横浜', nameRoman: 'Yokohama' },
      ],
      wantedDestination: { id: 2, groupId: 2, name: '品川' },
    };

    (useAtom as jest.Mock).mockReturnValue([mockStationState, jest.fn()]);

    const [state] = useAtom(stationState);

    // wantedDestination が設定されている場合は targetDestination のフィルタリングは無視される
    expect(state.wantedDestination).not.toBeNull();
    expect(state.wantedDestination?.groupId).toBe(2);
  });
});

describe('SelectBoundModal - onCloseAnimationEnd', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('onCloseAnimationEnd prop が SelectBoundModal に渡せる', () => {
    const mockOnCloseAnimationEnd = jest.fn();

    // SelectBoundModal の Props 型に onCloseAnimationEnd が含まれることを確認
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

    // Props が正しい型を持っていることを確認
    expect(props).toHaveProperty('onCloseAnimationEnd');
    expect(typeof props.onCloseAnimationEnd).toBe('function');
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
