import { LineType } from '~/@types/graphql';
import { createLine, createStation } from '~/utils/test/factories';
import {
  calcConfidence,
  deduplicate,
  findNearestStationIndices,
  monotonicity,
  scoreLine,
} from '../scoreLine';
import type { CandidateLine, FilteredLocationLog, ScoredLine } from '../types';

const mkStation = (id: number, lat: number, lng: number, name: string) =>
  createStation(id, { latitude: lat, longitude: lng, name, nameRoman: name });

const mkLog = (
  lat: number,
  lng: number,
  timestamp: number,
  distFromPrev = 0,
  dtFromPrev = 0
): FilteredLocationLog => ({
  latitude: lat,
  longitude: lng,
  accuracy: 30,
  timestamp,
  speed: null,
  distFromPrev,
  dtFromPrev,
});

describe('deduplicate', () => {
  it('連続する同じ値を除去する', () => {
    expect(deduplicate([1, 1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
  });

  it('空配列を返す', () => {
    expect(deduplicate([])).toEqual([]);
  });

  it('非連続の重複は保持する', () => {
    expect(deduplicate([1, 2, 1, 2])).toEqual([1, 2, 1, 2]);
  });
});

describe('monotonicity', () => {
  it('完全に昇順の場合1.0を返す', () => {
    expect(monotonicity([1, 3, 5, 7], 'asc')).toBe(1.0);
  });

  it('完全に降順の場合1.0を返す', () => {
    expect(monotonicity([7, 5, 3, 1], 'desc')).toBe(1.0);
  });

  it('混在の場合は割合を返す', () => {
    // 1→3 (asc), 3→2 (desc), 2→4 (asc) → 2/3
    expect(monotonicity([1, 3, 2, 4], 'asc')).toBeCloseTo(2 / 3);
  });

  it('要素が2未満の場合0を返す', () => {
    expect(monotonicity([1], 'asc')).toBe(0);
    expect(monotonicity([], 'asc')).toBe(0);
  });
});

describe('findNearestStationIndices', () => {
  it('各ログ点の最寄り駅インデックスを返す', () => {
    const stations = [
      mkStation(1, 35.68, 139.76, 'A'),
      mkStation(2, 35.69, 139.77, 'B'),
      mkStation(3, 35.7, 139.78, 'C'),
    ];
    const logs = [
      mkLog(35.681, 139.761, 0), // A付近
      mkLog(35.691, 139.771, 1000), // B付近
      mkLog(35.699, 139.779, 2000), // C付近
    ];
    const indices = findNearestStationIndices(logs, stations);
    expect(indices).toEqual([0, 1, 2]);
  });
});

describe('scoreLine', () => {
  it('候補路線にスコアを付与する', () => {
    const stations = [
      mkStation(1, 35.68, 139.76, 'A'),
      mkStation(2, 35.69, 139.77, 'B'),
      mkStation(3, 35.7, 139.78, 'C'),
    ];
    const candidate: CandidateLine = {
      line: createLine(100, { lineType: LineType.Normal, color: '#FF0000' }),
      stations,
    };
    const logs = [
      mkLog(35.681, 139.761, 0, 0, 0),
      mkLog(35.691, 139.771, 3000, 1300, 3),
      mkLog(35.699, 139.779, 6000, 1100, 3),
    ];
    const scored = scoreLine(candidate, logs);
    expect(scored.score).toBeGreaterThan(0);
    expect(scored.score).toBeLessThanOrEqual(1);
    expect(scored.scoreBreakdown.routeFitScore).toBeGreaterThanOrEqual(0);
    expect(scored.scoreBreakdown.orderScore).toBeGreaterThanOrEqual(0);
    expect(scored.scoreBreakdown.speedScore).toBeGreaterThanOrEqual(0);
    expect(scored.visitedIndices).toHaveLength(3);
  });
});

describe('calcConfidence', () => {
  it('信頼度を計算する', () => {
    const scoredLine: ScoredLine = {
      line: createLine(100, { lineType: LineType.Normal }),
      stations: [
        mkStation(1, 35.68, 139.76, 'A'),
        mkStation(2, 35.69, 139.77, 'B'),
        mkStation(3, 35.7, 139.78, 'C'),
      ],
      score: 0.8,
      scoreBreakdown: { routeFitScore: 0.9, orderScore: 0.8, speedScore: 0.6 },
      visitedIndices: [0, 1, 2],
    };
    const logs = [
      mkLog(35.681, 139.761, 0),
      mkLog(35.691, 139.771, 1000),
      mkLog(35.699, 139.779, 2000),
    ];
    const confidence = calcConfidence(scoredLine, logs);
    expect(confidence).toBeGreaterThan(0);
    expect(confidence).toBeLessThanOrEqual(1);
  });
});
