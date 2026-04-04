import { LineType } from '~/@types/graphql';
import { createLine, createStation } from '~/utils/test/factories';
import { estimateRoutes, filterBySpeed } from '../estimateRoute';
import type { CandidateLine, FilteredLocationLog } from '../types';

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

describe('estimateRoutes', () => {
  it('信頼度が高い候補を返す（理想的な条件）', () => {
    const stations = [
      createStation(1, { latitude: 35.68, longitude: 139.76, name: 'A' }),
      createStation(2, { latitude: 35.69, longitude: 139.77, name: 'B' }),
      createStation(3, { latitude: 35.7, longitude: 139.78, name: 'C' }),
    ];
    const candidate: CandidateLine = {
      line: createLine(100, { lineType: LineType.Normal }),
      stations,
    };
    // ログは駅近傍を順に通過、速度は Normal 範囲内
    const logs: FilteredLocationLog[] = [
      mkLog(35.6805, 139.7605, 0, 0, 0),
      mkLog(35.6905, 139.7705, 3000, 1300, 3),
      mkLog(35.6995, 139.7795, 6000, 1100, 3),
    ];

    const results = estimateRoutes([candidate], logs);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].confidence).toBeGreaterThanOrEqual(0.6);
    expect(results[0].line.id).toBe(100);
  });

  it('信頼度が低い候補は除外される（駅から遠い＋駅数不足）', () => {
    // 駅が1つだけ → stationFactor = 1/3 ≈ 0.33
    // ログが駅から遠い → pointCoverage低い, routeFitScore低い
    const stations = [
      createStation(1, { latitude: 35.68, longitude: 139.76, name: 'A' }),
    ];
    const candidate: CandidateLine = {
      line: createLine(200, { lineType: LineType.Normal }),
      stations,
    };
    // ログは駅から数km離れた場所
    const logs: FilteredLocationLog[] = [
      mkLog(35.75, 139.85, 0, 0, 0),
      mkLog(35.76, 139.86, 3000, 1300, 3),
      mkLog(35.77, 139.87, 6000, 1100, 3),
    ];

    const results = estimateRoutes([candidate], logs);
    // confidence = score * pointCoverage(≈0) * stationFactor(1/3) * accuracyFactor(1.0)
    // → ≈ 0 なので MIN_CONFIDENCE(0.6) を下回り除外
    expect(results).toHaveLength(0);
  });

  it('候補もログも空の場合は空配列を返す', () => {
    expect(estimateRoutes([], [])).toEqual([]);
  });
});

describe('filterBySpeed', () => {
  it('高速域では BulletTrain のみ残す', () => {
    const bullet: CandidateLine = {
      line: createLine(1, { lineType: LineType.BulletTrain }),
      stations: [],
    };
    const normal: CandidateLine = {
      line: createLine(2, { lineType: LineType.Normal }),
      stations: [],
    };
    // 中央値速度 > 50 m/s
    const logs: FilteredLocationLog[] = [
      mkLog(0, 0, 0, 0, 0),
      mkLog(0, 0, 1000, 60, 1),
      mkLog(0, 0, 2000, 70, 1),
    ];
    const result = filterBySpeed([bullet, normal], logs);
    expect(result).toHaveLength(1);
    expect(result[0].line.lineType).toBe(LineType.BulletTrain);
  });

  it('通常速度域では BulletTrain を除外する', () => {
    const bullet: CandidateLine = {
      line: createLine(1, { lineType: LineType.BulletTrain }),
      stations: [],
    };
    const normal: CandidateLine = {
      line: createLine(2, { lineType: LineType.Normal }),
      stations: [],
    };
    // 中央値速度 ≈ 20 m/s
    const logs: FilteredLocationLog[] = [
      mkLog(0, 0, 0, 0, 0),
      mkLog(0, 0, 1000, 20, 1),
      mkLog(0, 0, 2000, 20, 1),
    ];
    const result = filterBySpeed([bullet, normal], logs);
    expect(result).toHaveLength(1);
    expect(result[0].line.lineType).toBe(LineType.Normal);
  });
});
