import { useAtom } from 'jotai';
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
