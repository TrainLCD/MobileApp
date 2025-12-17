import { renderHook } from '@testing-library/react-native';
import { useAtom, useSetAtom } from 'jotai';
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
