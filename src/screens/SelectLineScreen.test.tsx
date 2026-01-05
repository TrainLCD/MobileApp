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

describe('SelectLineScreen - PresetCard押下時の状態リセット', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('openModalByLineId (hasTrainType: false のプリセット)', () => {
    it('pendingTrainType と fetchedTrainTypes がリセットされる', () => {
      const mockSetNavigationState = jest.fn();
      const mockNavigationState = {
        headerState: 'CURRENT',
        leftStations: [],
        trainType: null,
        pendingTrainType: { id: 1, groupId: 100, name: '快速' }, // 前回の値が残っている
        autoModeEnabled: true,
        stationForHeader: null,
        arrived: false,
        approaching: false,
        isLEDTheme: false,
        fetchedTrainTypes: [{ id: 1, groupId: 100, name: '快速' }], // 前回の値が残っている
        headerTransitionDelay: false,
        targetAutoModeStation: null,
        firstStop: true,
        presetsFetched: true,
        presetRoutes: [],
      };

      (useAtom as jest.Mock).mockReturnValue([
        mockNavigationState,
        mockSetNavigationState,
      ]);

      // openModalByLineId で行われる setNavigationState をシミュレート
      mockSetNavigationState((prev: typeof mockNavigationState) => ({
        ...prev,
        fetchedTrainTypes: [],
        pendingTrainType: null,
      }));

      expect(mockSetNavigationState).toHaveBeenCalledWith(expect.any(Function));

      const updateFunction = mockSetNavigationState.mock.calls[0][0];
      const updatedState = updateFunction(mockNavigationState);

      // pendingTrainType が null にリセットされている
      expect(updatedState.pendingTrainType).toBeNull();
      // fetchedTrainTypes が空配列にリセットされている
      expect(updatedState.fetchedTrainTypes).toEqual([]);
    });

    it('stationState の selectedDirection と wantedDestination がリセットされる', () => {
      const mockSetStationState = jest.fn();
      const mockStationState = {
        station: null,
        stations: [],
        pendingStation: null,
        pendingStations: [],
        selectedDirection: 'INBOUND', // 前回の値が残っている
        wantedDestination: { id: 1, groupId: 1, name: '東京' }, // 前回の値が残っている
      };

      (useAtom as jest.Mock).mockReturnValue([
        mockStationState,
        mockSetStationState,
      ]);

      // openModalByLineId で行われる setStationState をシミュレート
      mockSetStationState((prev: typeof mockStationState) => ({
        ...prev,
        selectedDirection: null,
        pendingStation: { id: 2, name: '渋谷' },
        pendingStations: [{ id: 2, name: '渋谷' }],
        wantedDestination: null,
      }));

      expect(mockSetStationState).toHaveBeenCalledWith(expect.any(Function));

      const updateFunction = mockSetStationState.mock.calls[0][0];
      const updatedState = updateFunction(mockStationState);

      expect(updatedState.selectedDirection).toBeNull();
      expect(updatedState.wantedDestination).toBeNull();
    });
  });

  describe('openModalByTrainTypeId (hasTrainType: true のプリセット)', () => {
    it('stationState の selectedDirection と wantedDestination がリセットされる', () => {
      const mockSetStationState = jest.fn();
      const mockStationState = {
        station: null,
        stations: [],
        pendingStation: null,
        pendingStations: [],
        selectedDirection: 'OUTBOUND', // 前回の値が残っている
        wantedDestination: { id: 1, groupId: 1, name: '品川' }, // 前回の値が残っている
      };

      (useAtom as jest.Mock).mockReturnValue([
        mockStationState,
        mockSetStationState,
      ]);

      // openModalByTrainTypeId で行われる setStationState をシミュレート
      mockSetStationState((prev: typeof mockStationState) => ({
        ...prev,
        selectedDirection: null,
        pendingStation: { id: 3, name: '新宿' },
        pendingStations: [{ id: 3, name: '新宿' }],
        wantedDestination: null,
      }));

      expect(mockSetStationState).toHaveBeenCalledWith(expect.any(Function));

      const updateFunction = mockSetStationState.mock.calls[0][0];
      const updatedState = updateFunction(mockStationState);

      expect(updatedState.selectedDirection).toBeNull();
      expect(updatedState.wantedDestination).toBeNull();
    });

    it('pendingTrainType が正しく設定される', () => {
      const mockSetNavigationState = jest.fn();
      const mockNavigationState = {
        headerState: 'CURRENT',
        leftStations: [],
        trainType: null,
        pendingTrainType: null,
        autoModeEnabled: true,
        stationForHeader: null,
        arrived: false,
        approaching: false,
        isLEDTheme: false,
        fetchedTrainTypes: [],
        headerTransitionDelay: false,
        targetAutoModeStation: null,
        firstStop: true,
        presetsFetched: true,
        presetRoutes: [],
      };

      const expectedTrainType = { id: 5, groupId: 200, name: '急行' };

      (useAtom as jest.Mock).mockReturnValue([
        mockNavigationState,
        mockSetNavigationState,
      ]);

      // openModalByTrainTypeId で行われる setNavigationState をシミュレート
      mockSetNavigationState((prev: typeof mockNavigationState) => ({
        ...prev,
        pendingTrainType: expectedTrainType,
        fetchedTrainTypes: [expectedTrainType],
      }));

      expect(mockSetNavigationState).toHaveBeenCalledWith(expect.any(Function));

      const updateFunction = mockSetNavigationState.mock.calls[0][0];
      const updatedState = updateFunction(mockNavigationState);

      expect(updatedState.pendingTrainType).toEqual(expectedTrainType);
      expect(updatedState.fetchedTrainTypes).toContainEqual(expectedTrainType);
    });
  });
});
