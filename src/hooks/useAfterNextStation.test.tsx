import { renderHook } from '@testing-library/react-native';
import { type Station, StopCondition } from '~/@types/graphql';
import { useAfterNextStation } from './useAfterNextStation';

jest.mock('./useDisplayNextStation', () => ({
  useDisplayNextStation: jest.fn(),
}));

jest.mock('./useSlicedStations', () => ({
  useSlicedStations: jest.fn(),
}));

const { useDisplayNextStation } = require('./useDisplayNextStation');
const { useSlicedStations } = require('./useSlicedStations');

const makeStation = (
  id: number,
  groupId: number,
  name: string,
  stopCondition: StopCondition = StopCondition.All
): Station =>
  ({
    id,
    groupId,
    name,
    stopCondition,
  }) as unknown as Station;

describe('useAfterNextStation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('案内中の次駅の直後の停車駅を返す', () => {
    const stations = [
      makeStation(1, 1, '築地市場'),
      makeStation(2, 2, '汐留'),
      makeStation(3, 3, '大門'),
      makeStation(4, 4, '赤羽橋'),
    ];
    useSlicedStations.mockReturnValue(stations);
    useDisplayNextStation.mockReturnValue(stations[1]);

    const { result } = renderHook(() => useAfterNextStation());

    expect(result.current?.name).toBe('大門');
  });

  it('次駅の直後が通過駅の場合はスキップして次の停車駅を返す', () => {
    const stations = [
      makeStation(1, 1, 'A'),
      makeStation(2, 2, 'B'),
      makeStation(3, 3, 'C', StopCondition.Not),
      makeStation(4, 4, 'D'),
    ];
    useSlicedStations.mockReturnValue(stations);
    useDisplayNextStation.mockReturnValue(stations[1]);

    const { result } = renderHook(() => useAfterNextStation());

    expect(result.current?.name).toBe('D');
  });

  it('到着判定の取りこぼしで状態が古くても案内中の次駅自身を次々駅にしない', () => {
    // 汐留到着の取りこぼしで stationState が築地市場のまま大門へ接近したケース。
    // useDisplayNextStation はGPS基準で大門へ自己修復されるため、
    // 次々駅は大門ではなく赤羽橋でなければならない (「大門の次は大門」回帰防止)。
    const stations = [
      makeStation(1, 1, '築地市場'),
      makeStation(2, 2, '汐留'),
      makeStation(3, 3, '大門'),
      makeStation(4, 4, '赤羽橋'),
    ];
    useSlicedStations.mockReturnValue(stations);
    useDisplayNextStation.mockReturnValue(stations[2]);

    const { result } = renderHook(() => useAfterNextStation());

    expect(result.current?.name).toBe('赤羽橋');
  });

  it('直通時に同じGroupIDの駅を別駅として扱わない', () => {
    // 直通境界駅 (同一 groupId の別レコード) が続く場合、
    // 「渋谷の次は渋谷」とならないよう重複を除外する
    const stations = [
      makeStation(1, 1, '中目黒'),
      makeStation(2, 2, '渋谷'),
      makeStation(3, 2, '渋谷'),
      makeStation(4, 4, '明治神宮前'),
    ];
    useSlicedStations.mockReturnValue(stations);
    useDisplayNextStation.mockReturnValue(stations[1]);

    const { result } = renderHook(() => useAfterNextStation());

    expect(result.current?.name).toBe('明治神宮前');
  });

  it('次駅が駅リストに見つからない場合は undefined を返す', () => {
    const stations = [makeStation(1, 1, 'A'), makeStation(2, 2, 'B')];
    useSlicedStations.mockReturnValue(stations);
    useDisplayNextStation.mockReturnValue(makeStation(99, 99, 'X'));

    const { result } = renderHook(() => useAfterNextStation());

    expect(result.current).toBeUndefined();
  });

  it('次駅が終点 (リスト末尾) の場合は undefined を返す', () => {
    const stations = [makeStation(1, 1, 'A'), makeStation(2, 2, 'B')];
    useSlicedStations.mockReturnValue(stations);
    useDisplayNextStation.mockReturnValue(stations[1]);

    const { result } = renderHook(() => useAfterNextStation());

    expect(result.current).toBeUndefined();
  });
});
