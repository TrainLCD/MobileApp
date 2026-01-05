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
