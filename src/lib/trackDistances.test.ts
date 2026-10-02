import {
  getTrackDistance,
  rememberTrackDistances,
  rememberTrackDistancesFromResponse,
  resetTrackDistancesForTesting,
} from './trackDistances';

describe('trackDistances', () => {
  afterEach(() => {
    resetTrackDistancesForTesting();
  });

  it('並びで隣り合う2駅の組に、後ろの駅の値を覚える', () => {
    rememberTrackDistances([
      { id: 1, trackDistanceFromPrevious: null },
      { id: 2, trackDistanceFromPrevious: 806 },
      { id: 3, trackDistanceFromPrevious: 1190 },
    ]);
    expect(getTrackDistance(1, 2)).toBe(806);
    expect(getTrackDistance(2, 3)).toBe(1190);
    // 隣り合っていない組は覚えない
    expect(getTrackDistance(1, 3)).toBeNull();
  });

  it('組は向きを問わずに引ける', () => {
    rememberTrackDistances([
      { id: 1, trackDistanceFromPrevious: null },
      { id: 2, trackDistanceFromPrevious: 806 },
    ]);
    expect(getTrackDistance(2, 1)).toBe(806);
  });

  it('線路データの無い区間(null)は覚えない', () => {
    rememberTrackDistances([
      { id: 1, trackDistanceFromPrevious: null },
      { id: 2, trackDistanceFromPrevious: null },
    ]);
    expect(getTrackDistance(1, 2)).toBeNull();
  });

  it('あとの応答で null が返った組は、前に覚えた値を消す', () => {
    rememberTrackDistances([
      { id: 1, trackDistanceFromPrevious: null },
      { id: 2, trackDistanceFromPrevious: 806 },
    ]);
    rememberTrackDistances([
      { id: 2, trackDistanceFromPrevious: null },
      { id: 1, trackDistanceFromPrevious: null },
    ]);
    expect(getTrackDistance(1, 2)).toBeNull();
  });

  it('応答から lineStations と lineGroupStations と stations だけを拾う', () => {
    rememberTrackDistancesFromResponse({
      lineStations: [
        { id: 1, trackDistanceFromPrevious: null },
        { id: 2, trackDistanceFromPrevious: 100 },
      ],
    });
    rememberTrackDistancesFromResponse({
      lineGroupStations: [
        { id: 3, trackDistanceFromPrevious: null },
        { id: 4, trackDistanceFromPrevious: 200 },
      ],
    });
    // stations(ids) は ids の並びのまま返る。sids のディープリンクで開いた経路
    rememberTrackDistancesFromResponse({
      stations: [
        { id: 9, trackDistanceFromPrevious: null },
        { id: 8, trackDistanceFromPrevious: 400 },
        { id: 7, trackDistanceFromPrevious: 500 },
      ],
    });
    rememberTrackDistancesFromResponse({
      stationsByName: [
        { id: 5, trackDistanceFromPrevious: null },
        { id: 6, trackDistanceFromPrevious: 300 },
      ],
    });
    rememberTrackDistancesFromResponse(null);
    expect(getTrackDistance(1, 2)).toBe(100);
    expect(getTrackDistance(3, 4)).toBe(200);
    expect(getTrackDistance(8, 9)).toBe(400);
    expect(getTrackDistance(7, 8)).toBe(500);
    expect(getTrackDistance(5, 6)).toBeNull();
  });
});
