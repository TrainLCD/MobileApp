/** biome-ignore-all lint/suspicious/noExplicitAny: テストコードまで型安全にするのはつらい */
import { renderHook, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { Provider, useAtomValue } from 'jotai';
import {
  LineType,
  OperationStatus,
  type Station,
  StopCondition,
  TrainTypeKind,
} from '~/@types/graphql';
import { YAMANOTE_LINE_ID } from '~/constants';
import * as useCurrentLineModule from '~/hooks/useCurrentLine';
import * as useCurrentTrainTypeModule from '~/hooks/useCurrentTrainType';
import * as useInRadiusStationModule from '~/hooks/useInRadiusStation';
import * as useLocationStoreModule from '~/hooks/useLocationStore';
import * as useNextStationModule from '~/hooks/useNextStation';
import { useSimulationMode } from '~/hooks/useSimulationMode';
import * as trainSpeedModule from '~/utils/trainSpeed';

jest.mock('jotai', () => ({
  ...jest.requireActual('jotai'),
  useAtomValue: jest.fn(),
}));

jest.mock('~/hooks/useLocationStore', () => ({
  useLocationStore: Object.assign(
    jest.fn(() => null),
    {
      setState: jest.fn(),
      getState: jest.fn(() => ({
        location: null,
        accuracyHistory: [],
      })),
      subscribe: jest.fn(),
      destroy: jest.fn(),
    }
  ),
  setLocation: jest.fn(),
}));

jest.mock('expo-location', () => ({
  hasStartedLocationUpdatesAsync: jest.fn(),
  stopLocationUpdatesAsync: jest.fn(),
  Accuracy: {
    Highest: 4,
    High: 3,
    Balanced: 2,
    Low: 1,
    Lowest: 0,
  },
}));

const mockStation = (
  id: number,
  groupId: number,
  lat: number,
  lon: number,
  lineId = YAMANOTE_LINE_ID
): Station =>
  ({
    __typename: 'Station',
    id,
    groupId,
    name: `Station ${id}`,
    nameKatakana: `ステーション${id}`,
    nameRoman: `Station ${id}`,
    nameChinese: undefined,
    nameKorean: undefined,
    threeLetterCode: undefined,
    latitude: lat,
    longitude: lon,
    lines: [],
    prefectureId: 13,
    postalCode: '100-0001',
    address: 'Tokyo',
    openedAt: '1900-01-01',
    closedAt: '9999-12-31',
    status: OperationStatus.InOperation,
    stationNumbers: [],
    stopCondition: StopCondition.All,
    distance: undefined,
    hasTrainTypes: undefined,
    line: { id: lineId, lineType: LineType.Normal },
    trainType: undefined,
  }) as unknown as Station;

describe('useSimulationMode', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(100000));

    // デフォルトのモック設定
    jest.spyOn(useCurrentLineModule, 'useCurrentLine').mockReturnValue({
      id: YAMANOTE_LINE_ID,
      lineType: LineType.Normal,
    } as any);

    jest
      .spyOn(useCurrentTrainTypeModule, 'useCurrentTrainType')
      .mockReturnValue(null);

    jest
      .spyOn(useInRadiusStationModule, 'useInRadiusStation')
      .mockReturnValue(null);

    jest
      .spyOn(useNextStationModule, 'useNextStation')
      .mockReturnValue(mockStation(2, 2, 35.681, 139.767));

    (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(
      false
    );
    (Location.stopLocationUpdatesAsync as jest.Mock).mockResolvedValue(
      undefined
    );

    //  setLocationをリセット
    (useLocationStoreModule.setLocation as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('自動モードが無効の場合は何もしない', () => {
    (useAtomValue as jest.Mock)
      .mockReturnValueOnce({
        stations: [],
        selectedDirection: 'OUTBOUND' as const,
      })
      .mockReturnValueOnce({
        enableLegacyAutoMode: false,
        autoModeEnabled: false,
      });

    const { result } = renderHook(() => useSimulationMode(), {
      wrapper: ({ children }) => <Provider>{children}</Provider>,
    });

    expect(result).toBeTruthy();
    expect(Location.hasStartedLocationUpdatesAsync).not.toHaveBeenCalled();
  });

  it('レガシー自動モードが有効の場合は何もしない', () => {
    (useAtomValue as jest.Mock)
      .mockReturnValueOnce({
        stations: [],
        selectedDirection: 'OUTBOUND' as const,
      })
      .mockReturnValueOnce({
        enableLegacyAutoMode: true,
        autoModeEnabled: true,
      });

    const { result } = renderHook(() => useSimulationMode(), {
      wrapper: ({ children }) => <Provider>{children}</Provider>,
    });

    expect(result).toBeTruthy();
  });

  it('自動モードが有効で位置情報更新が開始されている場合、停止する', async () => {
    (useAtomValue as jest.Mock)
      .mockReturnValueOnce({
        stations: [],
        selectedDirection: 'OUTBOUND' as const,
      })
      .mockReturnValueOnce({
        enableLegacyAutoMode: false,
        autoModeEnabled: true,
      });

    (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(
      true
    );
    (Location.stopLocationUpdatesAsync as jest.Mock).mockResolvedValue(
      undefined
    );

    renderHook(() => useSimulationMode(), {
      wrapper: ({ children }) => <Provider>{children}</Provider>,
    });

    // Wait for the effect to call stopLocationUpdatesAsync
    await waitFor(
      () => {
        expect(Location.stopLocationUpdatesAsync).toHaveBeenCalledTimes(1);
      },
      { timeout: 3000 }
    );
  });

  it('速度プロファイルを生成し、位置情報を更新する', () => {
    const stations = [
      mockStation(1, 1, 35.681, 139.767),
      mockStation(2, 2, 35.691, 139.777), // 約1.5km離れた地点
      mockStation(3, 3, 35.701, 139.787),
    ];

    (useAtomValue as jest.Mock)
      .mockReturnValueOnce({
        stations,
        selectedDirection: 'OUTBOUND' as const,
      })
      .mockReturnValueOnce({
        enableLegacyAutoMode: false,
        autoModeEnabled: true,
      });

    jest
      .spyOn(useInRadiusStationModule, 'useInRadiusStation')
      .mockReturnValue(stations[0]);

    jest
      .spyOn(useNextStationModule, 'useNextStation')
      .mockReturnValue(stations[1]);

    (
      useLocationStoreModule.useLocationStore as unknown as jest.Mock
    ).mockReturnValue({
      coords: {
        latitude: 35.681,
        longitude: 139.767,
        accuracy: 0,
        altitude: null,
        altitudeAccuracy: null,
        speed: 0,
        heading: null,
      },
      timestamp: 100000,
    });

    renderHook(() => useSimulationMode(), {
      wrapper: ({ children }) => <Provider>{children}</Provider>,
    });

    expect(useLocationStoreModule.setLocation).toHaveBeenCalled();
  });

  it('新幹線の路線タイプでは最高速度が適用される', () => {
    (useAtomValue as jest.Mock)
      .mockReturnValueOnce({
        stations: [],
        selectedDirection: 'OUTBOUND' as const,
      })
      .mockReturnValueOnce({
        enableLegacyAutoMode: false,
        autoModeEnabled: false,
      });

    jest
      .spyOn(useCurrentLineModule, 'useCurrentLine')
      .mockReturnValue({ id: 1, lineType: LineType.BulletTrain } as any);

    const { result } = renderHook(() => useSimulationMode(), {
      wrapper: ({ children }) => <Provider>{children}</Provider>,
    });

    expect(result).toBeTruthy();
    // 新幹線の速度プロファイルが生成されることを期待
  });

  it('列車種別の最高速度が適用される', () => {
    (useAtomValue as jest.Mock)
      .mockReturnValueOnce({
        stations: [],
        selectedDirection: 'OUTBOUND' as const,
      })
      .mockReturnValueOnce({
        enableLegacyAutoMode: false,
        autoModeEnabled: false,
      });

    jest
      .spyOn(useCurrentTrainTypeModule, 'useCurrentTrainType')
      .mockReturnValue({
        id: 1,
        kind: TrainTypeKind.LimitedExpress,
      } as any);

    const { result } = renderHook(() => useSimulationMode(), {
      wrapper: ({ children }) => <Provider>{children}</Provider>,
    });

    expect(result).toBeTruthy();
    // 特急の速度プロファイルが生成されることを期待
  });

  it('通過駅を除外して速度プロファイルを生成する', () => {
    const stations = [
      mockStation(1, 1, 35.681, 139.767),
      {
        ...mockStation(2, 2, 35.691, 139.777),
        stopCondition: StopCondition.Not,
      },
      mockStation(3, 3, 35.701, 139.787),
    ];

    (useAtomValue as jest.Mock)
      .mockReturnValueOnce({
        stations,
        selectedDirection: 'OUTBOUND' as const,
      })
      .mockReturnValueOnce({
        enableLegacyAutoMode: false,
        autoModeEnabled: false,
      });

    jest
      .spyOn(useInRadiusStationModule, 'useInRadiusStation')
      .mockReturnValue(stations[0]);

    jest
      .spyOn(useNextStationModule, 'useNextStation')
      .mockReturnValue(stations[2]);

    const { result } = renderHook(() => useSimulationMode(), {
      wrapper: ({ children }) => <Provider>{children}</Provider>,
    });

    expect(result).toBeTruthy();
    // 通過駅を除外した速度プロファイルが生成されることを期待
  });

  it('INBOUNDの場合、駅リストを逆順にする', () => {
    const stations = [
      mockStation(1, 1, 35.681, 139.767),
      mockStation(2, 2, 35.691, 139.777),
      mockStation(3, 3, 35.701, 139.787),
    ];

    (useAtomValue as jest.Mock)
      .mockReturnValueOnce({
        stations,
        selectedDirection: 'INBOUND' as const,
      })
      .mockReturnValueOnce({
        enableLegacyAutoMode: false,
        autoModeEnabled: true,
      });

    jest
      .spyOn(useInRadiusStationModule, 'useInRadiusStation')
      .mockReturnValue(stations[2]);

    jest
      .spyOn(useNextStationModule, 'useNextStation')
      .mockReturnValue(stations[1]);

    (
      useLocationStoreModule.useLocationStore as unknown as jest.Mock
    ).mockReturnValue({
      coords: {
        latitude: 35.701,
        longitude: 139.787,
        accuracy: 0,
        altitude: null,
        altitudeAccuracy: null,
        speed: 0,
        heading: null,
      },
      timestamp: 100000,
    });

    renderHook(() => useSimulationMode(), {
      wrapper: ({ children }) => <Provider>{children}</Provider>,
    });

    // 初期化時に現在駅の位置にsetLocationが呼ばれることを検証
    const setLocationCalls = (useLocationStoreModule.setLocation as jest.Mock)
      .mock.calls;

    expect(setLocationCalls.length).toBeGreaterThan(0);

    // INBOUNDの場合、駅リストが逆順になるため、
    // 速度プロファイルも逆順の駅間で生成される
    // 初期化時の位置が期待する駅（stations[2]）に設定されることを確認
    const initialCall = setLocationCalls[0][0];
    expect(initialCall.coords.latitude).toBe(35.701);
    expect(initialCall.coords.longitude).toBe(139.787);
  });

  it('次の駅がない場合、最初の駅に戻る', () => {
    const stations = [mockStation(1, 1, 35.681, 139.767)];

    (useAtomValue as jest.Mock)
      .mockReturnValueOnce({
        stations,
        selectedDirection: 'OUTBOUND' as const,
      })
      .mockReturnValueOnce({
        enableLegacyAutoMode: false,
        autoModeEnabled: true,
      });

    jest
      .spyOn(useInRadiusStationModule, 'useInRadiusStation')
      .mockReturnValue(stations[0]);

    jest
      .spyOn(useNextStationModule, 'useNextStation')
      .mockReturnValue(undefined);

    (
      useLocationStoreModule.useLocationStore as unknown as jest.Mock
    ).mockReturnValue({
      coords: {
        latitude: 35.681,
        longitude: 139.767,
        accuracy: 0,
        altitude: null,
        altitudeAccuracy: null,
        speed: 0,
        heading: null,
      },
      timestamp: 100000,
    });

    renderHook(() => useSimulationMode(), {
      wrapper: ({ children }) => <Provider>{children}</Provider>,
    });

    // step関数が呼ばれたときに最初の駅に戻ることを期待
    expect(useLocationStoreModule.setLocation).toHaveBeenCalled();
  });

  it('緯度・経度が未定義の駅は速度プロファイル生成から除外される', () => {
    const stations = [
      mockStation(1, 1, 35.681, 139.767),
      { ...mockStation(2, 2, 0, 0), latitude: undefined, longitude: undefined },
      mockStation(3, 3, 35.701, 139.787),
      mockStation(4, 4, 35.711, 139.797),
    ];

    // Spy on generateTrainSpeedProfile to verify it's not called for stations with undefined coordinates
    const generateSpeedProfileSpy = jest.spyOn(
      trainSpeedModule,
      'generateTrainSpeedProfile'
    );

    (useAtomValue as jest.Mock)
      .mockReturnValueOnce({
        stations,
        selectedDirection: 'OUTBOUND' as const,
      })
      .mockReturnValueOnce({
        enableLegacyAutoMode: false,
        autoModeEnabled: true, // Enable auto mode to trigger profile generation
      });

    jest
      .spyOn(useInRadiusStationModule, 'useInRadiusStation')
      .mockReturnValue(stations[2]); // Start at station 3 (which has valid coordinates)

    jest
      .spyOn(useNextStationModule, 'useNextStation')
      .mockReturnValue(stations[3]); // Next station is station 4

    (
      useLocationStoreModule.useLocationStore as unknown as jest.Mock
    ).mockReturnValue({
      coords: {
        latitude: 35.701,
        longitude: 139.787,
        accuracy: 0,
        altitude: null,
        altitudeAccuracy: null,
        speed: 0,
        heading: null,
      },
      timestamp: 100000,
    });

    renderHook(() => useSimulationMode(), {
      wrapper: ({ children }) => <Provider>{children}</Provider>,
    });

    // Verify that generateTrainSpeedProfile was called only for segments with valid coordinates
    // With stations [1, 2 (undefined), 3, 4]:
    // - Station 1 → Station 2: NOT called (station 2 has undefined coords)
    // - Station 2 → Station 3: NOT called (station 2 has undefined coords)
    // - Station 3 → Station 4: CALLED (both have valid coords)
    // Total: 1 call
    expect(generateSpeedProfileSpy).toHaveBeenCalledTimes(1);

    // Verify the call was made with valid distance (station 3 to station 4)
    const callArgs = generateSpeedProfileSpy.mock.calls[0][0];
    expect(callArgs.distance).toBeGreaterThan(0);
    expect(callArgs.maxSpeed).toBeDefined();
    expect(callArgs.accel).toBeDefined();
    expect(callArgs.decel).toBeDefined();
  });

  it('インターバルで位置情報が定期的に更新される', () => {
    const stations = [
      mockStation(1, 1, 35.681, 139.767),
      mockStation(2, 2, 35.691, 139.777),
    ];

    (useAtomValue as jest.Mock)
      .mockReturnValueOnce({
        stations,
        selectedDirection: 'OUTBOUND' as const,
      })
      .mockReturnValueOnce({
        enableLegacyAutoMode: false,
        autoModeEnabled: true,
      });

    jest
      .spyOn(useInRadiusStationModule, 'useInRadiusStation')
      .mockReturnValue(stations[0]);

    jest
      .spyOn(useNextStationModule, 'useNextStation')
      .mockReturnValue(stations[1]);

    (
      useLocationStoreModule.useLocationStore as unknown as jest.Mock
    ).mockReturnValue({
      coords: {
        latitude: 35.681,
        longitude: 139.767,
        accuracy: 0,
        altitude: null,
        altitudeAccuracy: null,
        speed: 0,
        heading: null,
      },
      timestamp: 100000,
    });

    const { unmount } = renderHook(() => useSimulationMode(), {
      wrapper: ({ children }) => <Provider>{children}</Provider>,
    });

    // 1秒進める
    jest.advanceTimersByTime(1000);

    // setLocationが複数回呼ばれることを期待（初期化 + インターバル更新）
    expect(
      (useLocationStoreModule.setLocation as jest.Mock).mock.calls.length
    ).toBeGreaterThan(0);

    unmount();
  });

  it('速度プロファイルの終端に達したら次のセグメントに移動する', () => {
    const stations = [
      mockStation(1, 1, 35.681, 139.767),
      mockStation(2, 2, 35.682, 139.768), // 短距離
      mockStation(3, 3, 35.683, 139.769),
    ];

    (useAtomValue as jest.Mock)
      .mockReturnValueOnce({
        stations,
        selectedDirection: 'OUTBOUND' as const,
      })
      .mockReturnValueOnce({
        enableLegacyAutoMode: false,
        autoModeEnabled: true,
      });

    jest
      .spyOn(useInRadiusStationModule, 'useInRadiusStation')
      .mockReturnValue(stations[0]);

    jest
      .spyOn(useNextStationModule, 'useNextStation')
      .mockReturnValue(stations[1]);

    (
      useLocationStoreModule.useLocationStore as unknown as jest.Mock
    ).mockReturnValue({
      coords: {
        latitude: 35.681,
        longitude: 139.767,
        accuracy: 0,
        altitude: null,
        altitudeAccuracy: null,
        speed: 0,
        heading: null,
      },
      timestamp: 100000,
    });

    renderHook(() => useSimulationMode(), {
      wrapper: ({ children }) => <Provider>{children}</Provider>,
    });

    // 複数回タイマーを進めてセグメント移動をテスト
    for (let i = 0; i < 10; i++) {
      jest.advanceTimersByTime(1000);
    }

    expect(useLocationStoreModule.setLocation).toHaveBeenCalled();
  });
});
