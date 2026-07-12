import { renderHook, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import getDistance from 'geolib/es/getDistance';
import { Provider, useAtomValue } from 'jotai';
import {
  LineType,
  OperationStatus,
  type Station,
  StopCondition,
} from '~/@types/graphql';
import { YAMANOTE_LINE_ID } from '~/constants';
import * as useCurrentTrainTypeModule from '~/hooks/useCurrentTrainType';
import { useGraphQLQuery } from '~/hooks/useGraphQLQuery';
import { useLoopLine } from '~/hooks/useLoopLine';
import { useSimulationMode } from '~/hooks/useSimulationMode';
import { GET_TRAIN_ROUTE } from '~/lib/graphql/queries';
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
  stationAtom: { toString: () => 'stationAtom' },
  stationsAtom: { toString: () => 'stationsAtom' },
  selectedDirectionAtom: { toString: () => 'selectedDirectionAtom' },
  selectedBoundAtom: { toString: () => 'selectedBoundAtom' },
}));

jest.mock('~/store/atoms/navigation', () => ({
  __esModule: true,
  default: { toString: () => 'navigationState' },
  autoModeEnabledAtom: { toString: () => 'autoModeEnabledAtom' },
}));

jest.mock('~/store/atoms/speech', () => ({
  __esModule: true,
  default: { toString: () => 'speechState' },
  resetFirstSpeechAtom: { toString: () => 'resetFirstSpeechAtom' },
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

jest.mock('~/hooks/useLoopLine', () => ({
  useLoopLine: jest.fn(() => ({
    isLoopLine: false,
  })),
}));

jest.mock('~/hooks/useGraphQLQuery', () => ({
  useGraphQLQuery: jest.fn(),
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
    switch (atom.toString()) {
      case 'stationAtom':
        return stationStateValue.station ?? null;
      case 'stationsAtom':
        return stationStateValue.stations;
      case 'selectedDirectionAtom':
        return stationStateValue.selectedDirection;
      case 'autoModeEnabledAtom':
        return navigationStateValue.autoModeEnabled;
      default:
        return undefined;
    }
  });
};

/**
 * useGraphQLQuery(GET_TRAIN_ROUTE) のモック応答を設定する。
 * segments はフックが maybeRevsersedStations と同じ並び順・同じ要素数で
 * 返ってくることを前提に位置対応させているため、引数には実際にシミュレーションが
 * 辿る並び順（INBOUND ならそのまま、OUTBOUNDなら reverse 済み）の駅配列を渡す。
 */
const mockTrainRoute = (
  stationsInWalkOrder: Station[],
  overrides: { maxSpeed?: number; accel?: number; decel?: number } = {}
) => {
  const { maxSpeed = 30, accel = 1.0, decel = 1.5 } = overrides;

  const segments = stationsInWalkOrder.map((s, i) => {
    const prev = stationsInWalkOrder[i - 1];
    const distanceFromPrevious =
      i === 0 ||
      prev?.latitude == null ||
      prev?.longitude == null ||
      s.latitude == null ||
      s.longitude == null
        ? 0
        : getDistance(
            { latitude: prev.latitude, longitude: prev.longitude },
            { latitude: s.latitude, longitude: s.longitude }
          );

    return {
      __typename: 'TrainRouteSegment' as const,
      distanceFromPrevious,
      maxAcceleration: accel,
      maxDeceleration: decel,
      maxSpeed,
    };
  });

  (useGraphQLQuery as jest.Mock).mockReturnValue({
    data: { trainRoute: { __typename: 'TrainRouteResponse', segments } },
    loading: false,
    error: undefined,
  });
};

describe('useSimulationMode', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(100000));

    // 各テストは非ループ線を前提とする。ループ線テストで上書きした実装が
    // 後続テストへ漏れないよう毎回明示的にリセットする。
    (useLoopLine as jest.Mock).mockReturnValue({ isLoopLine: false });

    jest
      .spyOn(useCurrentTrainTypeModule, 'useCurrentTrainType')
      .mockReturnValue(null);

    (useGraphQLQuery as jest.Mock).mockReturnValue({
      data: undefined,
      loading: false,
      error: undefined,
    });

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

      mockTrainRoute([...stations].reverse());

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

      mockTrainRoute([...stations].reverse());

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

      mockTrainRoute(stations);

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

    it('終点到達後は即座に折り返さず終点で停車し続ける', () => {
      // 駅が1つだけ → nextStopStationがない → 即座に終点扱い
      const stations = [mockStation(1, 1, 35.681, 139.767)];

      setupAtomMocks(
        {
          station: stations[0],
          stations,
          selectedDirection: 'INBOUND',
        },
        { autoModeEnabled: true }
      );

      // dwell処理内でstore.getが呼ばれる
      (store.get as jest.Mock).mockReturnValue(
        mockLocationObject(35.681, 139.767)
      );

      // 速度プロファイルは空（駅が1つで次の駅がない）なので
      // interval tick 1: speeds=[], i(0)>=0 → dwellPending=true
      // interval tick 2以降: dwell handler → nextSegment=-1 → 終点で停車し
      //   TERMINAL_DWELL_TICKS に達するまで方面逆転せず待機し続ける。
      // 待機中は始発駅へワープせず、終点座標で speed=0 のまま留まる。
      renderHook(() => useSimulationMode(), {
        wrapper: ({ children }) => <Provider>{children}</Provider>,
      });

      // 6秒分進める（待機継続中）
      jest.advanceTimersByTime(6000);

      // 終点座標で speed=0 の位置更新が繰り返しセットされることを確認
      const locationSetCalls = (store.set as jest.Mock).mock.calls
        .filter((call) => call[0] === locationAtom)
        .map((call) => call[1]);

      const dwellCalls = locationSetCalls.filter(
        (loc) =>
          loc?.coords?.latitude === stations[0].latitude &&
          loc?.coords?.longitude === stations[0].longitude &&
          loc?.coords?.speed === 0
      );
      // 終点停車中の複数回の位置更新
      expect(dwellCalls.length).toBeGreaterThanOrEqual(2);

      // 待機時間(60ティック)未満では方面逆転(selectedDirection書き込み)は起きない
      const directionSetCalls = (store.set as jest.Mock).mock.calls.filter(
        (call) => call[0]?.toString?.() === 'selectedDirectionAtom'
      );
      expect(directionSetCalls).toHaveLength(0);
    });

    it('終点で約1分停車したのち方面を逆転して折り返す', () => {
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

      mockTrainRoute(stations);

      // 1駅1ティックで終点まで到達させる
      jest
        .spyOn(trainSpeedModule, 'generateTrainSpeedProfile')
        .mockReturnValue([2000]);

      // resetFirstSpeechAtom は非ゼロの数値、それ以外(locationAtom)は位置オブジェクトを返す。
      // 非ゼロ(3)にすることで「現在値 + 1」を読んでいることを検証できる（固定値1だと通ってしまう）。
      (store.get as jest.Mock).mockImplementation((atom) =>
        atom?.toString?.() === 'resetFirstSpeechAtom'
          ? 3
          : mockLocationObject(35.691, 139.777)
      );

      renderHook(() => useSimulationMode(), {
        wrapper: ({ children }) => <Provider>{children}</Provider>,
      });

      // 終点到達 + 30秒程度の停車。まだ待機時間(約60秒)に満たないので折り返さない
      jest.advanceTimersByTime(30000);

      let directionSetCalls = (store.set as jest.Mock).mock.calls.filter(
        (call) => call[0]?.toString?.() === 'selectedDirectionAtom'
      );
      expect(directionSetCalls).toHaveLength(0);
      // 折り返す前は初回放送の再発火も起きない
      expect(
        (store.set as jest.Mock).mock.calls.filter(
          (call) => call[0]?.toString?.() === 'resetFirstSpeechAtom'
        )
      ).toHaveLength(0);

      // さらに進めて待機時間を超過させると方面(selectedDirection/selectedBound)が逆転する
      jest.advanceTimersByTime(40000);

      directionSetCalls = (store.set as jest.Mock).mock.calls.filter(
        (call) => call[0]?.toString?.() === 'selectedDirectionAtom'
      );
      expect(directionSetCalls.length).toBeGreaterThanOrEqual(1);
      // INBOUND → OUTBOUND へ逆転
      expect(directionSetCalls[0][1]).toBe('OUTBOUND');

      // 折り返し後の行き先(selectedBound)も更新される
      const boundSetCalls = (store.set as jest.Mock).mock.calls.filter(
        (call) => call[0]?.toString?.() === 'selectedBoundAtom'
      );
      expect(boundSetCalls.length).toBeGreaterThanOrEqual(1);

      // 折り返し時に初回放送(firstSpeech)が再発火する(resetFirstSpeechをインクリメント)。
      // 現在値3 + 1 = 4 が設定され、二重発火せず1回だけ呼ばれることを検証する。
      const resetFirstSpeechCalls = (store.set as jest.Mock).mock.calls.filter(
        (call) => call[0]?.toString?.() === 'resetFirstSpeechAtom'
      );
      expect(resetFirstSpeechCalls).toHaveLength(1);
      expect(resetFirstSpeechCalls[0][1]).toBe(4);
    });

    it('ループ線では終点でも方面を逆転せず先頭に戻って周回を続ける', () => {
      (useLoopLine as jest.Mock).mockReturnValue({ isLoopLine: true });

      const stations = [
        mockStation(1, 1, 35.681, 139.767),
        mockStation(2, 2, 35.691, 139.777),
      ];

      setupAtomMocks(
        {
          station: stations[1],
          stations,
          selectedDirection: 'INBOUND',
        },
        { autoModeEnabled: true }
      );

      // ループ線 + INBOUND では進行順が reverse される（[s2, s1]）
      mockTrainRoute([stations[1], stations[0]]);

      jest
        .spyOn(trainSpeedModule, 'generateTrainSpeedProfile')
        .mockReturnValue([2000]);

      (store.get as jest.Mock).mockReturnValue(
        mockLocationObject(35.691, 139.777)
      );

      renderHook(() => useSimulationMode(), {
        wrapper: ({ children }) => <Provider>{children}</Provider>,
      });

      // 非ループ線なら折り返す待機時間を超過しても、ループ線では方面を逆転しない
      jest.advanceTimersByTime(70000);

      const directionSetCalls = (store.set as jest.Mock).mock.calls.filter(
        (call) => call[0]?.toString?.() === 'selectedDirectionAtom'
      );
      expect(directionSetCalls).toHaveLength(0);

      // 先頭駅（周回の始点）へ戻る位置更新が行われている
      const locationSetCalls = (store.set as jest.Mock).mock.calls
        .filter((call) => call[0] === locationAtom)
        .map((call) => call[1]);
      const backToStartCalls = locationSetCalls.filter(
        (loc) =>
          loc?.coords?.latitude === stations[1].latitude &&
          loc?.coords?.longitude === stations[1].longitude &&
          loc?.coords?.speed === 0
      );
      expect(backToStartCalls.length).toBeGreaterThanOrEqual(1);
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

      mockTrainRoute([...stations].reverse());

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

  describe('速度プロファイル生成（trainRouteクエリへの委譲）', () => {
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

      mockTrainRoute(stations);

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

      mockTrainRoute([...stations].reverse());

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
      setupAtomMocks(
        { station: null, stations: [], selectedDirection: 'INBOUND' },
        { autoModeEnabled: true }
      );

      const { rerender } = renderHook(() => useSimulationMode(), {
        wrapper: ({ children }) => <Provider>{children}</Provider>,
      });

      // 駅が空なのでプロファイル生成は呼ばれない
      expect(generateSpy).not.toHaveBeenCalled();

      // 再レンダー: 駅リストとtrainRouteのデータが到着
      const stations = [
        mockStation(1, 1, 35.681, 139.767),
        mockStation(2, 2, 35.691, 139.777),
      ];

      setupAtomMocks(
        { station: stations[0], stations, selectedDirection: 'INBOUND' },
        { autoModeEnabled: true }
      );

      mockTrainRoute(stations);

      (store.get as jest.Mock).mockReturnValue(
        mockLocationObject(35.681, 139.767)
      );

      rerender({});

      // 駅とtrainRouteのデータが到着したのでプロファイル生成が呼ばれる
      expect(generateSpy).toHaveBeenCalled();
    });

    it('trainType.groupIdがlineGroupIdとしてクエリに渡される', () => {
      const stations = [
        mockStation(1, 1, 35.681, 139.767),
        mockStation(2, 2, 35.691, 139.777),
      ];

      setupAtomMocks(
        { station: stations[0], stations, selectedDirection: 'OUTBOUND' },
        { autoModeEnabled: true }
      );

      jest
        .spyOn(useCurrentTrainTypeModule, 'useCurrentTrainType')
        .mockReturnValue({
          id: 1,
          groupId: 42,
          // biome-ignore lint/suspicious/noExplicitAny: 部分的なモック戻り値
        } as any);

      renderHook(() => useSimulationMode(), {
        wrapper: ({ children }) => <Provider>{children}</Provider>,
      });

      expect(useGraphQLQuery).toHaveBeenCalledWith(
        GET_TRAIN_ROUTE,
        expect.objectContaining({
          variables: expect.objectContaining({
            fromStationId: stations[1].id,
            toStationId: stations[0].id,
            lineGroupId: 42,
          }),
        })
      );
    });

    it('trainRouteが返す最高速度・加減速度がそのままgenerateTrainSpeedProfileに渡される', () => {
      const stations = [
        mockStation(1, 1, 35.681, 139.767),
        mockStation(2, 2, 35.691, 139.777),
      ];

      setupAtomMocks(
        { station: stations[0], stations, selectedDirection: 'OUTBOUND' },
        { autoModeEnabled: false }
      );

      mockTrainRoute([...stations].reverse(), {
        maxSpeed: 99,
        accel: 2,
        decel: 3,
      });

      const generateSpy = jest.spyOn(
        trainSpeedModule,
        'generateTrainSpeedProfile'
      );

      renderHook(() => useSimulationMode(), {
        wrapper: ({ children }) => <Provider>{children}</Provider>,
      });

      expect(generateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ maxSpeed: 99, accel: 2, decel: 3 })
      );
    });
  });

  describe('重複する駅IDの処理', () => {
    /**
     * 駅リスト構成:
     *   index 0: A (id=10)
     *   index 1: B (id=20) ← 1回目
     *   index 2: C (id=30)
     *   index 3: D (id=20, groupId=60) ← 同じid=20の2回目
     *   index 4: E (id=50)
     *
     * dropEitherJunctionStation は隣接groupIdの重複のみ除去するため、
     * 非隣接の同一IDは残る。trainRouteのsegmentsは駅IDではなく配列位置で
     * 対応付けられるため、同一IDの重複があっても位置がずれない。
     */
    const duplicateIdStations = () => [
      mockStation(10, 10, 35.0, 139.0),
      mockStation(20, 20, 35.05, 139.05),
      mockStation(30, 30, 35.1, 139.1),
      mockStation(20, 60, 35.2, 139.2),
      mockStation(50, 50, 35.25, 139.25),
    ];

    it('重複する駅IDがある場合に速度プロファイルが正しい距離で生成される', () => {
      const stations = duplicateIdStations();

      setupAtomMocks(
        { station: stations[0], stations, selectedDirection: 'INBOUND' },
        { autoModeEnabled: false }
      );

      mockTrainRoute(stations);

      const generateSpy = jest.spyOn(
        trainSpeedModule,
        'generateTrainSpeedProfile'
      );

      renderHook(() => useSimulationMode(), {
        wrapper: ({ children }) => <Provider>{children}</Provider>,
      });

      // 4つの停車駅セグメント: A→B, B→C, C→D, D→E
      expect(generateSpy).toHaveBeenCalledTimes(4);

      // D→E (4番目) の距離がD→E直線距離と同程度（約7km）であること
      // バグ時は id=20 のルックアップが B(index=1) を指してしまい
      // betweenNextStation に C,D を含むジグザグ経路（約35km）になる
      const deDistance = generateSpy.mock.calls[3][0].distance;
      expect(deDistance).toBeLessThan(10000);
      expect(deDistance).toBeGreaterThan(3000);
    });

    it('重複する駅IDがある場合でもシミュレーションが正しく前進する', () => {
      const stations = duplicateIdStations();

      setupAtomMocks(
        {
          station: stations[2], // C(id=30)から開始
          stations,
          selectedDirection: 'INBOUND',
        },
        { autoModeEnabled: true }
      );

      mockTrainRoute(stations);

      jest
        .spyOn(trainSpeedModule, 'generateTrainSpeedProfile')
        .mockReturnValue([2000]);

      (store.get as jest.Mock).mockReturnValue(mockLocationObject(35.1, 139.1));

      renderHook(() => useSimulationMode(), {
        wrapper: ({ children }) => <Provider>{children}</Provider>,
      });

      // 4秒分進める:
      // tick 1: C→Dステップ (lat ≈ 35.2)
      // tick 2: dwellPending
      // tick 3: dwell処理 → D→Eセグメントへ移動
      // tick 4: D→Eステップ (lat ≈ 35.25)
      jest.advanceTimersByTime(4000);

      const locationSetCalls = (store.set as jest.Mock).mock.calls
        .filter((call) => call[0] === locationAtom)
        .map((call) => call[1]);

      // 実際の移動を伴うstep呼び出し（speed > 0）を抽出
      const steppingCalls = locationSetCalls.filter(
        (loc) => typeof loc?.coords?.speed === 'number' && loc.coords.speed > 0
      );

      // C→D(tick1) と D→E(tick4) の2回、D以降の緯度(>= 35.15)に到達するはず
      // バグ時は id=20 のルックアップが B を指してしまい D→Eステップが
      // B→C区間(lat ≈ 35.05〜35.1)を通り、1回しか >= 35.15 にならない
      const callsBeyondMidpoint = steppingCalls.filter(
        (loc) => loc.coords.latitude >= 35.15
      );
      expect(callsBeyondMidpoint.length).toBeGreaterThanOrEqual(2);
    });

    it('同一駅オブジェクトが再登場する場合でも終端まで前進する', () => {
      const stationA = mockStation(10, 10, 35.0, 139.0);
      const stationB = mockStation(20, 20, 35.05, 139.05);
      const stationC = mockStation(30, 30, 35.1, 139.1);
      const stationD = mockStation(50, 50, 35.25, 139.25);
      const stations = [
        stationA,
        stationB,
        stationC,
        stationB, // 同一参照を再利用
        stationD,
      ];

      setupAtomMocks(
        {
          station: stationC,
          stations,
          selectedDirection: 'INBOUND',
        },
        { autoModeEnabled: true }
      );

      mockTrainRoute(stations);

      jest
        .spyOn(trainSpeedModule, 'generateTrainSpeedProfile')
        .mockReturnValue([2000]);

      (store.get as jest.Mock).mockReturnValue(mockLocationObject(35.1, 139.1));

      renderHook(() => useSimulationMode(), {
        wrapper: ({ children }) => <Provider>{children}</Provider>,
      });

      // tick 1: C→(2回目の)B
      // tick 2: dwellPending
      // tick 3: dwell処理でDセグメントへ移動
      // tick 4: B→D で緯度が大きく前進する
      jest.advanceTimersByTime(4000);

      const locationSetCalls = (store.set as jest.Mock).mock.calls
        .filter((call) => call[0] === locationAtom)
        .map((call) => call[1]);
      const steppingCalls = locationSetCalls.filter(
        (loc) => typeof loc?.coords?.speed === 'number' && loc.coords.speed > 0
      );
      const reachedTerminalSide = steppingCalls.some(
        (loc) => loc.coords.latitude >= 35.2
      );

      expect(reachedTerminalSide).toBe(true);
    });

    it('重複IDの駅間に通過駅がある場合も正しいウェイポイントが使用される', () => {
      const stations = [
        mockStation(10, 10, 35.0, 139.0),
        mockStation(20, 20, 35.05, 139.05),
        mockStation(30, 30, 35.1, 139.1), // C
        mockPassStation(40, 40, 35.1, 139.2), // 通過駅（東にオフセット）
        mockStation(20, 60, 35.2, 139.1), // D (id=20, same as B)
        mockStation(50, 50, 35.25, 139.15),
      ];

      setupAtomMocks(
        { station: stations[0], stations, selectedDirection: 'INBOUND' },
        { autoModeEnabled: false }
      );

      mockTrainRoute(stations);

      const generateSpy = jest.spyOn(
        trainSpeedModule,
        'generateTrainSpeedProfile'
      );

      renderHook(() => useSimulationMode(), {
        wrapper: ({ children }) => <Provider>{children}</Provider>,
      });

      // C→D (3番目) の距離が通過駅経由の経路距離であること
      // 直線 C(35.1,139.1)→D(35.2,139.1) ≈ 11km
      // 経路 C→pass(35.1,139.2)→D ≈ 9km + 14km ≈ 23km
      // バグ時は id=20 のルックアップが B(index=1) を指してしまい、
      // 通過駅ウェイポイントの距離が失われる
      const cdDistance = generateSpy.mock.calls[2][0].distance;
      expect(cdDistance).toBeGreaterThan(15000);
    });
  });
});
