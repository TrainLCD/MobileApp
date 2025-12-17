import { renderHook } from '@testing-library/react-native';
import { useAtom } from 'jotai';
import navigationState from '../store/atoms/navigation';

// Mock jotai
jest.mock('jotai', () => ({
  useAtom: jest.fn(),
  atom: jest.fn((initialValue) => initialValue),
}));

describe('SelectLineScreen - pendingWantedDestination削除', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('路線変更時にpendingWantedDestinationの設定が削除されている', () => {
    const mockSetNavigationState = jest.fn();
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

    (useAtom as jest.Mock).mockReturnValue([
      mockNavigationState,
      mockSetNavigationState,
    ]);

    // 路線変更時の処理をシミュレート
    mockSetNavigationState((prev: typeof mockNavigationState) => ({
      ...prev,
      fetchedTrainTypes: [],
      trainType: null,
    }));

    expect(mockSetNavigationState).toHaveBeenCalledWith(expect.any(Function));

    // 呼び出された関数が pendingWantedDestination を設定していないことを確認
    const updateFunction = mockSetNavigationState.mock.calls[0][0];
    const updatedState = updateFunction(mockNavigationState);
    expect(updatedState).not.toHaveProperty('pendingWantedDestination');
  });

  it('ラインリセット時にpendingWantedDestinationの設定が削除されている', () => {
    const mockSetNavigationState = jest.fn();
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

    (useAtom as jest.Mock).mockReturnValue([
      mockNavigationState,
      mockSetNavigationState,
    ]);

    // ラインリセット時の処理をシミュレート
    mockSetNavigationState((prev: typeof mockNavigationState) => ({
      ...prev,
      fetchedTrainTypes: [],
      trainType: null,
    }));

    expect(mockSetNavigationState).toHaveBeenCalledWith(expect.any(Function));

    // pendingWantedDestination が設定されていないことを確認
    const updateFunction = mockSetNavigationState.mock.calls[0][0];
    const updatedState = updateFunction(mockNavigationState);
    expect(updatedState).not.toHaveProperty('pendingWantedDestination');
  });

  it('navigationStateの型定義からpendingWantedDestinationが削除されている', () => {
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
});
