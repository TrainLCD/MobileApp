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
import {
  LINE_TYPE_MAX_SPEEDS_IN_M_S,
  TRAIN_TYPE_KIND_MAX_SPEEDS_IN_M_S,
  YAMANOTE_LINE_ID,
} from '~/constants';
import * as useCurrentLineModule from '~/hooks/useCurrentLine';
import * as useCurrentTrainTypeModule from '~/hooks/useCurrentTrainType';
import { useSimulationMode } from '~/hooks/useSimulationMode';
import { store } from '~/store';
import { locationAtom } from '~/store/atoms/location';
import * as trainSpeedModule from '~/utils/trainSpeed';

jest.mock('jotai', () => ({
  ...jest.requireActual('jotai'),
  useAtomValue: jest.fn(),
}));

jest.mock('~/store/atoms/station', () => ({
  __esModule: true,
  default: { toString: () => 'stationState' },
}));

jest.mock('~/store/atoms/navigation', () => ({
  __esModule: true,
  default: { toString: () => 'navigationState' },
}));

jest.mock('~/store', () => ({
  store: {
    get: jest.fn(() => null),
    set: jest.fn(),
  },
}));

jest.mock('~/store/atoms/location', () => ({
  locationAtom: { toString: () => 'locationAtom' },
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

const mockPassStation = (
  id: number,
  groupId: number,
  lat: number,
  lon: number
): Station => ({
  ...mockStation(id, groupId, lat, lon),
  stopCondition: StopCondition.Not,
});

const mockLocationObject = (lat: number, lon: number) => ({
  coords: {
    latitude: lat,
    longitude: lon,
    accuracy: 0,
    altitude: null,
    altitudeAccuracy: null,
    speed: 0,
    heading: null,
  },
  timestamp: 100000,
});

/** useAtomValueの戻り値を設定するヘルパー */
const setupAtomMocks = (
  stationStateValue: {
    station?: Station | null;
    stations: Station[];
    selectedDirection: 'INBOUND' | 'OUTBOUND';
  },
  navigationStateValue: { autoModeEnabled: boolean }
) => {
  // biome-ignore lint/suspicious/noExplicitAny: モック用コールバックの引数型が不明
  (useAtomValue as jest.Mock).mockImplementation((atom: any) => {
    if (atom.toString() === 'stationState') {
      return {
        station: stationStateValue.station ?? null,
        stations: stationStateValue.stations,
        selectedDirection: stationStateValue.selectedDirection,
      };
    }
    if (atom.toString() === 'navigationState') {
      return navigationStateValue;
    }
    return undefined;
  });
};

describe('useSimulationMode', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(100000));

    jest.spyOn(useCurrentLineModule, 'useCurrentLine').mockReturnValue({
      id: YAMANOTE_LINE_ID,
      lineType: LineType.Normal,
      // biome-ignore lint/suspicious/noExplicitAny: 部分的なモック戻り値
    } as any);

    jest
      .spyOn(useCurrentTrainTypeModule, 'useCurrentTrainType')
      .mockReturnValue(null);

    (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(
      false
    );
    (Location.stopLocationUpdatesAsync as jest.Mock).mockResolvedValue(
      undefined
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('自動モードが無効の場合は何もしない', () => {
    setupAtomMocks(
      { stations: [], selectedDirection: 'OUTBOUND' },
      { autoModeEnabled: false }
    );

    renderHook(() => useSimulationMode(), {
      wrapper: ({ children }) => <Provider>{children}</Provider>,
    });

    expect(Location.hasStartedLocationUpdatesAsync).not.toHaveBeenCalled();
    expect(store.set).not.toHaveBeenCalled();
  });

  it('自動モード有効の場合でも駅がなければ位置を設定しない', () => {
    setupAtomMocks(
      { stations: [], selectedDirection: 'OUTBOUND' },
      { autoModeEnabled: true }
    );

    renderHook(() => useSimulationMode(), {
      wrapper: ({ children }) => <Provider>{children}</Provider>,
    });

    // 駅が空なので store.set(locationAtom, ...) は呼ばれない
    const locationSetCalls = (store.set as jest.Mock).mock.calls.filter(
      (call) => call[0] === locationAtom
    );
    expect(locationSetCalls).toHaveLength(0);
  });

  it('自動モードが有効で位置情報更新が開始されている場合、停止する', async () => {
    setupAtomMocks(
      { stations: [], selectedDirection: 'OUTBOUND' },
      { autoModeEnabled: true }
    );

    (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(
      true
    );

    renderHook(() => useSimulationMode(), {
      wrapper: ({ children }) => <Provider>{children}</Provider>,
    });

    await waitFor(
      () => {
        expect(Location.stopLocationUpdatesAsync).toHaveBeenCalledTimes(1);
      },
      { timeout: 3000 }
    );
  });

  describe('開始駅の決定（resolveStartIndex）', () => {
    it('currentStationが対象路線に含まれる場合、その駅から開始する', () => {
      const stations = [
        mockStation(1, 1, 35.681, 139.767),
        mockStation(2, 2, 35.691, 139.777),
        mockStation(3, 3, 35.701, 139.787),
      ];

      setupAtomMocks(
        {
          station: stations[1],
          stations,
          selectedDirection: 'OUTBOUND',
        },
        { autoModeEnabled: true }
      );

      (store.get as jest.Mock).mockReturnValue(
        mockLocationObject(35.691, 139.777)
      );

      renderHook(() => useSimulationMode(), {
        wrapper: ({ children }) => <Provider>{children}</Provider>,
      });

      // OUTBOUNDなのでreverse → [3,2,1]の順。station[1](id=2)のインデックスは1
      const locationSetCalls = (store.set as jest.Mock).mock.calls.filter(
        (call) => call[0] === locationAtom
      );
      expect(locationSetCalls.length).toBeGreaterThan(0);

      const initialSetCall = locationSetCalls[0][1];
      expect(initialSetCall.coords.latitude).toBe(stations[1].latitude);
      expect(initialSetCall.coords.longitude).toBe(stations[1].longitude);
    });

    it('currentStationが対象路線に含まれない場合、座標から最寄り停車駅を探す', () => {
      const stations = [
        mockStation(1, 1, 35.681, 139.767),
        mockStation(2, 2, 35.691, 139.777),
        mockStation(3, 3, 35.701, 139.787),
      ];

      // 別路線の駅（id=99）で、座標的にはstations[2]に最も近い
      const otherLineStation = mockStation(99, 99, 35.7, 139.786, 9999);

      setupAtomMocks(
        {
          station: otherLineStation,
          stations,
          selectedDirection: 'INBOUND',
        },
        { autoModeEnabled: true }
      );

      (store.get as jest.Mock).mockReturnValue(
        mockLocationObject(35.7, 139.786)
      );

      renderHook(() => useSimulationMode(), {
        wrapper: ({ children }) => <Provider>{children}</Provider>,
      });

      const locationSetCalls = (store.set as jest.Mock).mock.calls.filter(
        (call) => call[0] === locationAtom
      );
      expect(locationSetCalls.length).toBeGreaterThan(0);

      // INBOUND → 駅順はそのまま [1,2,3]。座標的にstations[2]が最寄り
      const initialSetCall = locationSetCalls[0][1];
      expect(initialSetCall.coords.latitude).toBe(stations[2].latitude);
      expect(initialSetCall.coords.longitude).toBe(stations[2].longitude);
    });

    it('currentStationがnullの場合、先頭の駅から開始する', () => {
      const stations = [
        mockStation(1, 1, 35.681, 139.767),
        mockStation(2, 2, 35.691, 139.777),
      ];

      setupAtomMocks(
        {
          station: null,
          stations,
          selectedDirection: 'OUTBOUND',
        },
        { autoModeEnabled: true }
      );

      (store.get as jest.Mock).mockReturnValue(
        mockLocationObject(35.681, 139.767)
      );

      renderHook(() => useSimulationMode(), {
        wrapper: ({ children }) => <Provider>{children}</Provider>,
      });

      const locationSetCalls = (store.set as jest.Mock).mock.calls.filter(
        (call) => call[0] === locationAtom
      );
      expect(locationSetCalls.length).toBeGreaterThan(0);

      // OUTBOUNDなのでreverse → [2,1]。nullフォールバックで先頭=stations[1](id=2)
      const initialSetCall = locationSetCalls[0][1];
      expect(initialSetCall.coords.latitude).toBe(stations[1].latitude);
      expect(initialSetCall.coords.longitude).toBe(stations[1].longitude);
    });

    it('currentStationが通過駅の場合、座標から最寄り停車駅を選ぶ', () => {
      const stations = [
        mockStation(1, 1, 35.681, 139.767),
        mockPassStation(2, 2, 35.699, 139.786), // 通過駅（currentStation、station 3に近い座標）
        mockStation(3, 3, 35.701, 139.787),
      ];

      setupAtomMocks(
        {
          station: stations[1], // 通過駅を現在駅として設定
          stations,
          selectedDirection: 'INBOUND',
        },
        { autoModeEnabled: true }
      );

      (store.get as jest.Mock).mockReturnValue(
        mockLocationObject(35.699, 139.786)
      );

      renderHook(() => useSimulationMode(), {
        wrapper: ({ children }) => <Provider>{children}</Provider>,
      });

      const locationSetCalls = (store.set as jest.Mock).mock.calls.filter(
        (call) => call[0] === locationAtom
      );
      expect(locationSetCalls.length).toBeGreaterThan(0);

      // 通過駅(id=2)はdirectIndexで見つかるがgetIsPassでスキップされ、
      // 座標フォールバックで最寄り停車駅のstations[2](id=3)が選ばれる
      const initialSetCall = locationSetCalls[0][1];
      expect(initialSetCall.coords.latitude).toBe(stations[2].latitude);
      expect(initialSetCall.coords.longitude).toBe(stations[2].longitude);
    });

    it('フォールバックで通過駅をスキップして最寄り停車駅を選ぶ', () => {
      const stations = [
        mockStation(1, 1, 35.681, 139.767),
        mockPassStation(2, 2, 35.7, 139.786), // 通過駅（座標的に最も近い）
        mockStation(3, 3, 35.701, 139.787),
      ];

      // 別路線の駅、座標的にはpassStation(id=2)に最も近い
      const otherLineStation = mockStation(99, 99, 35.7, 139.786, 9999);

      setupAtomMocks(
        {
          station: otherLineStation,
          stations,
          selectedDirection: 'INBOUND',
        },
        { autoModeEnabled: true }
      );

      (store.get as jest.Mock).mockReturnValue(
        mockLocationObject(35.7, 139.786)
      );

      renderHook(() => useSimulationMode(), {
        wrapper: ({ children }) => <Provider>{children}</Provider>,
      });

      const locationSetCalls = (store.set as jest.Mock).mock.calls.filter(
        (call) => call[0] === locationAtom
      );
      expect(locationSetCalls.length).toBeGreaterThan(0);

      // 通過駅(id=2)はスキップされ、停車駅のうち最寄りのstations[2](id=3)が選ばれる
      const initialSetCall = locationSetCalls[0][1];
      expect(initialSetCall.coords.latitude).toBe(stations[2].latitude);
      expect(initialSetCall.coords.longitude).toBe(stations[2].longitude);
    });
  });

  describe('シミュレーション進行', () => {
    it('全ての位置更新がstore.setを使用する（setLocationを使わない）', () => {
      const stations = [
        mockStation(1, 1, 35.681, 139.767),
        mockStation(2, 2, 35.691, 139.777),
      ];

      setupAtomMocks(
        {
          station: stations[0],
          stations,
          selectedDirection: 'OUTBOUND',
        },
        { autoModeEnabled: true }
      );

      (store.get as jest.Mock).mockReturnValue(
        mockLocationObject(35.691, 139.777)
      );

      renderHook(() => useSimulationMode(), {
        wrapper: ({ children }) => <Provider>{children}</Provider>,
      });

      jest.advanceTimersByTime(3000);

      // store.setがlocationAtomに対して呼ばれている
      const locationSetCalls = (store.set as jest.Mock).mock.calls.filter(
        (call) => call[0] === locationAtom
      );
      expect(locationSetCalls.length).toBeGreaterThan(0);
    });

    it('インターバルで位置情報が定期的に更新される', () => {
      const stations = [
        mockStation(1, 1, 35.681, 139.767),
        mockStation(2, 2, 35.691, 139.777),
      ];

      setupAtomMocks(
        {
          station: stations[0],
          stations,
          selectedDirection: 'OUTBOUND',
        },
        { autoModeEnabled: true }
      );

      (store.get as jest.Mock).mockReturnValue(
        mockLocationObject(35.681, 139.767)
      );

      const { unmount } = renderHook(() => useSimulationMode(), {
        wrapper: ({ children }) => <Provider>{children}</Provider>,
      });

      const callsBefore = (store.set as jest.Mock).mock.calls.filter(
        (call) => call[0] === locationAtom
      ).length;

      jest.advanceTimersByTime(3000);

      const callsAfter = (store.set as jest.Mock).mock.calls.filter(
        (call) => call[0] === locationAtom
      ).length;

      // インターバルにより追加の位置更新が行われる
      expect(callsAfter).toBeGreaterThan(callsBefore);

      unmount();
    });

    it('セグメント終端で0km/hの停車を入れる', () => {
      const stations = [
        mockStation(1, 1, 35.681, 139.767),
        mockStation(2, 2, 35.691, 139.777),
      ];

      setupAtomMocks(
        {
          station: stations[0],
          stations,
          selectedDirection: 'INBOUND',
        },
        { autoModeEnabled: true }
      );

      jest
        .spyOn(trainSpeedModule, 'generateTrainSpeedProfile')
        .mockReturnValue([2000]);

      (store.get as jest.Mock).mockReturnValue(
        mockLocationObject(35.681, 139.767)
      );

      renderHook(() => useSimulationMode(), {
        wrapper: ({ children }) => <Provider>{children}</Provider>,
      });

      jest.advanceTimersByTime(3000);

      const locationSetCalls = (store.set as jest.Mock).mock.calls
        .filter((call) => call[0] === locationAtom)
        .map((call) => call[1]);

      expect(locationSetCalls.some((loc) => loc?.coords?.speed === 0)).toBe(
        true
      );
    });

    it('終端駅到達後、先頭に戻ったときに速度プロファイルを最初から再生する', () => {
      // 駅が1つだけ → nextStopStationがない → 即座に先頭リセット
      const stations = [mockStation(1, 1, 35.681, 139.767)];

      setupAtomMocks(
        {
          station: stations[0],
          stations,
          selectedDirection: 'INBOUND',
        },
        { autoModeEnabled: true }
      );

      // step内でstore.getが呼ばれる
      (store.get as jest.Mock).mockReturnValue(
        mockLocationObject(35.681, 139.767)
      );

      // 速度プロファイルは空（駅が1つで次の駅がない）なので
      // interval tick 1: speeds=[], i(0)>=0 → dwellPending=true
      // interval tick 2: dwell handler → nextSegment=-1 → 先頭に戻る
      // interval tick 3: speeds=[] again → dwellPending=true
      // 先頭に戻る際にchildIndexがリセットされていれば、
      // 毎回i=0から開始される（リセットされていないとiが進み続ける）
      renderHook(() => useSimulationMode(), {
        wrapper: ({ children }) => <Provider>{children}</Provider>,
      });

      // 6秒分進める（複数回のリセットサイクルを経る）
      jest.advanceTimersByTime(6000);

      // 先頭駅の位置が繰り返しセットされることを確認（リセットが正しく機能している）
      const locationSetCalls = (store.set as jest.Mock).mock.calls
        .filter((call) => call[0] === locationAtom)
        .map((call) => call[1]);

      const resetCalls = locationSetCalls.filter(
        (loc) =>
          loc?.coords?.latitude === stations[0].latitude &&
          loc?.coords?.longitude === stations[0].longitude &&
          loc?.coords?.speed === 0
      );
      // 初期化 + dwellハンドラでの複数回リセット
      expect(resetCalls.length).toBeGreaterThanOrEqual(2);
    });

    it('速度プロファイルの終端に達したら次のセグメントに移動する', () => {
      const stations = [
        mockStation(1, 1, 35.681, 139.767),
        mockStation(2, 2, 35.682, 139.768),
        mockStation(3, 3, 35.683, 139.769),
      ];

      setupAtomMocks(
        {
          station: stations[0],
          stations,
          selectedDirection: 'OUTBOUND',
        },
        { autoModeEnabled: true }
      );

      (store.get as jest.Mock).mockReturnValue(
        mockLocationObject(35.683, 139.769)
      );

      renderHook(() => useSimulationMode(), {
        wrapper: ({ children }) => <Provider>{children}</Provider>,
      });

      for (let i = 0; i < 10; i++) {
        jest.advanceTimersByTime(1000);
      }

      const locationSetCalls = (store.set as jest.Mock).mock.calls.filter(
        (call) => call[0] === locationAtom
      );
      expect(locationSetCalls.length).toBeGreaterThan(1);
    });
  });

  describe('駅リストの方向', () => {
    it('INBOUNDの場合、駅リストはそのまま使われる', () => {
      const stations = [
        mockStation(1, 1, 35.681, 139.767),
        mockStation(2, 2, 35.691, 139.777),
        mockStation(3, 3, 35.701, 139.787),
      ];

      setupAtomMocks(
        {
          station: stations[2],
          stations,
          selectedDirection: 'INBOUND',
        },
        { autoModeEnabled: true }
      );

      (store.get as jest.Mock).mockReturnValue(
        mockLocationObject(35.701, 139.787)
      );

      renderHook(() => useSimulationMode(), {
        wrapper: ({ children }) => <Provider>{children}</Provider>,
      });

      const locationSetCalls = (store.set as jest.Mock).mock.calls.filter(
        (call) => call[0] === locationAtom
      );
      expect(locationSetCalls.length).toBeGreaterThan(0);

      const initialSetCall = locationSetCalls[0][1];
      expect(initialSetCall.coords.latitude).toBe(stations[2].latitude);
      expect(initialSetCall.coords.longitude).toBe(stations[2].longitude);
    });
  });

  describe('速度プロファイル生成', () => {
    it('通過駅を除外して速度プロファイルを生成する', () => {
      const stations = [
        mockStation(1, 1, 35.681, 139.767),
        mockPassStation(2, 2, 35.691, 139.777),
        mockStation(3, 3, 35.701, 139.787),
      ];

      setupAtomMocks(
        {
          station: stations[0],
          stations,
          selectedDirection: 'INBOUND',
        },
        { autoModeEnabled: false }
      );

      const generateSpy = jest.spyOn(
        trainSpeedModule,
        'generateTrainSpeedProfile'
      );

      renderHook(() => useSimulationMode(), {
        wrapper: ({ children }) => <Provider>{children}</Provider>,
      });

      // 通過駅(id=2)は除外され、station 1→3 の1セグメントのみ生成
      expect(generateSpy).toHaveBeenCalledTimes(1);
    });

    it('緯度・経度が未定義の駅は速度プロファイル生成から除外される', () => {
      const stations = [
        mockStation(1, 1, 35.681, 139.767),
        {
          ...mockStation(2, 2, 0, 0),
          latitude: undefined,
          longitude: undefined,
        },
        mockStation(3, 3, 35.701, 139.787),
        mockStation(4, 4, 35.711, 139.797),
      ];

      setupAtomMocks(
        {
          station: stations[2],
          stations,
          selectedDirection: 'OUTBOUND',
        },
        { autoModeEnabled: true }
      );

      const generateSpy = jest.spyOn(
        trainSpeedModule,
        'generateTrainSpeedProfile'
      );

      (store.get as jest.Mock).mockReturnValue(
        mockLocationObject(35.701, 139.787)
      );

      renderHook(() => useSimulationMode(), {
        wrapper: ({ children }) => <Provider>{children}</Provider>,
      });

      // station 2は座標未定義のためスキップ。有効なのは station 3→4 の1セグメント
      expect(generateSpy).toHaveBeenCalledTimes(1);
      const callArgs = generateSpy.mock.calls[0][0];
      expect(callArgs.distance).toBeGreaterThan(0);
    });

    it('駅リストが非同期に変わったら速度プロファイルを再計算する', () => {
      const generateSpy = jest.spyOn(
        trainSpeedModule,
        'generateTrainSpeedProfile'
      );

      // 初回レンダー: 空の駅リスト
      (useAtomValue as jest.Mock)
        .mockReturnValueOnce({
          station: null,
          stations: [],
          selectedDirection: 'INBOUND',
        })
        .mockReturnValueOnce({ autoModeEnabled: true });

      const { rerender } = renderHook(() => useSimulationMode(), {
        wrapper: ({ children }) => <Provider>{children}</Provider>,
      });

      // 駅が空なのでプロファイル生成は呼ばれない
      expect(generateSpy).not.toHaveBeenCalled();

      // 再レンダー: 駅リストが到着
      const stations = [
        mockStation(1, 1, 35.681, 139.767),
        mockStation(2, 2, 35.691, 139.777),
      ];

      (useAtomValue as jest.Mock)
        .mockReturnValueOnce({
          station: stations[0],
          stations,
          selectedDirection: 'INBOUND',
        })
        .mockReturnValueOnce({ autoModeEnabled: true });

      (store.get as jest.Mock).mockReturnValue(
        mockLocationObject(35.681, 139.767)
      );

      rerender({});

      // 駅が到着したのでプロファイル生成が呼ばれる
      expect(generateSpy).toHaveBeenCalled();
    });

    it('新幹線の路線タイプでは最高速度が適用される', () => {
      const stations = [
        mockStation(1, 1, 35.681, 139.767),
        mockStation(2, 2, 35.691, 139.777),
      ];

      setupAtomMocks(
        { station: stations[0], stations, selectedDirection: 'OUTBOUND' },
        { autoModeEnabled: false }
      );

      jest
        .spyOn(useCurrentLineModule, 'useCurrentLine')
        // biome-ignore lint/suspicious/noExplicitAny: 部分的なモック戻り値
        .mockReturnValue({ id: 1, lineType: LineType.BulletTrain } as any);

      const generateSpy = jest.spyOn(
        trainSpeedModule,
        'generateTrainSpeedProfile'
      );

      renderHook(() => useSimulationMode(), {
        wrapper: ({ children }) => <Provider>{children}</Provider>,
      });

      expect(generateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          maxSpeed: LINE_TYPE_MAX_SPEEDS_IN_M_S[LineType.BulletTrain],
        })
      );
    });

    it('列車種別の最高速度が適用される', () => {
      const stations = [
        mockStation(1, 1, 35.681, 139.767),
        mockStation(2, 2, 35.691, 139.777),
      ];

      setupAtomMocks(
        { station: stations[0], stations, selectedDirection: 'OUTBOUND' },
        { autoModeEnabled: false }
      );

      jest
        .spyOn(useCurrentTrainTypeModule, 'useCurrentTrainType')
        .mockReturnValue({
          id: 1,
          kind: TrainTypeKind.LimitedExpress,
          // biome-ignore lint/suspicious/noExplicitAny: 部分的なモック戻り値
        } as any);

      const generateSpy = jest.spyOn(
        trainSpeedModule,
        'generateTrainSpeedProfile'
      );

      renderHook(() => useSimulationMode(), {
        wrapper: ({ children }) => <Provider>{children}</Provider>,
      });

      expect(generateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          maxSpeed:
            TRAIN_TYPE_KIND_MAX_SPEEDS_IN_M_S[TrainTypeKind.LimitedExpress],
        })
      );
    });
  });
});
