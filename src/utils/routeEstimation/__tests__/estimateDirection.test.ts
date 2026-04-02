import { estimateDirection } from '../estimateDirection';
import type { ScoredLine } from '../types';

const mkStation = (id: number, lat: number, lng: number, name: string) =>
  ({
    __typename: 'Station' as const,
    id,
    latitude: lat,
    longitude: lng,
    name,
    nameRoman: name,
    line: null,
    lines: null,
    stopCondition: null,
  }) as never;

describe('estimateDirection', () => {
  it('インデックス昇順の場合 INBOUND を返す', () => {
    const scoredLine: ScoredLine = {
      line: {
        __typename: 'LineNested',
        id: 100,
        lineType: 'Normal',
      } as never,
      stations: [
        mkStation(1, 35.68, 139.76, 'A'),
        mkStation(2, 35.69, 139.77, 'B'),
        mkStation(3, 35.7, 139.78, 'C'),
        mkStation(4, 35.71, 139.79, 'D'),
      ],
      score: 0.8,
      scoreBreakdown: { routeFitScore: 0.9, orderScore: 0.8, speedScore: 0.6 },
      visitedIndices: [0, 1, 2, 3],
    };

    const result = estimateDirection(scoredLine);
    expect(result).not.toBeNull();
    expect(result?.direction).toBe('INBOUND');
    expect(result?.currentStation.id).toBe(4); // 最後のインデックスの駅
    expect(result?.boundStation).toBeDefined();
  });

  it('インデックス降順の場合 OUTBOUND を返す', () => {
    const scoredLine: ScoredLine = {
      line: {
        __typename: 'LineNested',
        id: 100,
        lineType: 'Normal',
      } as never,
      stations: [
        mkStation(1, 35.68, 139.76, 'A'),
        mkStation(2, 35.69, 139.77, 'B'),
        mkStation(3, 35.7, 139.78, 'C'),
        mkStation(4, 35.71, 139.79, 'D'),
      ],
      score: 0.8,
      scoreBreakdown: { routeFitScore: 0.9, orderScore: 0.8, speedScore: 0.6 },
      visitedIndices: [3, 2, 1, 0],
    };

    const result = estimateDirection(scoredLine);
    expect(result).not.toBeNull();
    expect(result?.direction).toBe('OUTBOUND');
  });

  it('空のvisitedIndicesでnullを返す', () => {
    const scoredLine: ScoredLine = {
      line: {
        __typename: 'LineNested',
        id: 100,
        lineType: 'Normal',
      } as never,
      stations: [mkStation(1, 35.68, 139.76, 'A')],
      score: 0.8,
      scoreBreakdown: { routeFitScore: 0.9, orderScore: 0.8, speedScore: 0.6 },
      visitedIndices: [],
    };
    expect(estimateDirection(scoredLine)).toBeNull();
  });

  it('環状線（山手線）で方向を推定する', () => {
    const YAMANOTE_LINE_ID = 11302;
    const stations = Array.from({ length: 30 }, (_, i) =>
      mkStation(
        1130200 + i,
        35.68 + i * 0.003,
        139.76 + i * 0.003,
        `Station${i}`
      )
    );

    const scoredLine: ScoredLine = {
      line: {
        __typename: 'LineNested',
        id: YAMANOTE_LINE_ID,
        lineType: 'Normal',
      } as never,
      stations,
      score: 0.8,
      scoreBreakdown: { routeFitScore: 0.9, orderScore: 0.8, speedScore: 0.6 },
      visitedIndices: [0, 1, 2, 3, 4],
    };

    const result = estimateDirection(scoredLine);
    expect(result).not.toBeNull();
    expect(result?.direction).toBeDefined();
  });
});
