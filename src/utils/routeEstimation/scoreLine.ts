import getDistance from 'geolib/es/getDistance';
import type { Line, Station } from '~/@types/graphql';
import { LineType } from '~/@types/graphql';
import type { CandidateLine, FilteredLocationLog, ScoredLine } from './types';

// 経路適合スコアの最大許容距離 (m)
const MAX_FIT_DISTANCE = 500;

// lineType別の期待速度範囲 (m/s)
const SPEED_RANGES: Record<string, [number, number]> = {
  [LineType.Normal]: [5, 40],
  [LineType.Subway]: [5, 35],
  [LineType.BulletTrain]: [30, 90],
  [LineType.MonorailOrAgt]: [3, 25],
  [LineType.Tram]: [2, 15],
  [LineType.OtherLineType]: [3, 40],
};

const DEFAULT_SPEED_RANGE: [number, number] = [3, 40];

/**
 * ログ点から路線polyline（隣接2駅を結ぶ線分群）への最短距離を計算する
 * 簡易実装: 各ログ点から全駅までの最短距離の平均を使う
 */
const calcRouteFitScore = (
  logs: FilteredLocationLog[],
  stations: Station[]
): number => {
  if (logs.length === 0 || stations.length === 0) return 0;

  const stationCoords = stations
    .filter((s) => s.latitude != null && s.longitude != null)
    .map((s) => ({
      latitude: s.latitude as number,
      longitude: s.longitude as number,
    }));

  if (stationCoords.length === 0) return 0;

  let totalMinDist = 0;
  for (const log of logs) {
    let minDist = Number.POSITIVE_INFINITY;
    for (const sc of stationCoords) {
      const dist = getDistance(
        { latitude: log.latitude, longitude: log.longitude },
        sc
      );
      if (dist < minDist) {
        minDist = dist;
      }
    }
    totalMinDist += minDist;
  }

  const avgDist = totalMinDist / logs.length;
  return Math.max(0, 1 - avgDist / MAX_FIT_DISTANCE);
};

/**
 * 各ログ点の最寄り駅インデックスを返す
 */
export const findNearestStationIndices = (
  logs: FilteredLocationLog[],
  stations: Station[]
): number[] => {
  const stationCoords = stations
    .map((s, idx) => ({
      idx,
      latitude: s.latitude as number,
      longitude: s.longitude as number,
      valid: s.latitude != null && s.longitude != null,
    }))
    .filter((s) => s.valid);

  if (stationCoords.length === 0) return [];

  return logs.map((log) => {
    let minDist = Number.POSITIVE_INFINITY;
    let minIdx = 0;
    for (const sc of stationCoords) {
      const dist = getDistance(
        { latitude: log.latitude, longitude: log.longitude },
        { latitude: sc.latitude, longitude: sc.longitude }
      );
      if (dist < minDist) {
        minDist = dist;
        minIdx = sc.idx;
      }
    }
    return minIdx;
  });
};

/**
 * 連続する同じ値を除去する
 */
export const deduplicate = (indices: number[]): number[] => {
  if (indices.length === 0) return [];
  const result = [indices[0]];
  for (let i = 1; i < indices.length; i++) {
    if (indices[i] !== indices[i - 1]) {
      result.push(indices[i]);
    }
  }
  return result;
};

/**
 * 数列の単調性スコアを計算する
 * 隣接ペアのうち指定方向（昇順/降順）に進んでいる割合
 * 急行による「飛び」は正しい方向として許容
 */
export const monotonicity = (
  deduped: number[],
  direction: 'asc' | 'desc'
): number => {
  if (deduped.length < 2) return 0;
  let correct = 0;
  const total = deduped.length - 1;
  for (let i = 0; i < total; i++) {
    if (direction === 'asc' && deduped[i + 1] > deduped[i]) {
      correct++;
    } else if (direction === 'desc' && deduped[i + 1] < deduped[i]) {
      correct++;
    }
  }
  return correct / total;
};

/**
 * 駅通過順序スコアを計算する
 */
const calcOrderScore = (visitedIndices: number[]): number => {
  const deduped = deduplicate(visitedIndices);
  if (deduped.length < 2) return 0;
  const ascScore = monotonicity(deduped, 'asc');
  const descScore = monotonicity(deduped, 'desc');
  return Math.max(ascScore, descScore);
};

/**
 * 速度整合スコアを計算する
 */
const calcSpeedScore = (logs: FilteredLocationLog[], line: Line): number => {
  const speeds = logs
    .filter((l) => l.dtFromPrev > 0)
    .map((l) => l.distFromPrev / l.dtFromPrev);

  if (speeds.length === 0) return 0.5;

  const lineType = line.lineType ?? LineType.Normal;
  const [minSpeed, maxSpeed] = SPEED_RANGES[lineType] ?? DEFAULT_SPEED_RANGE;

  let inRange = 0;
  for (const speed of speeds) {
    if (speed >= minSpeed && speed <= maxSpeed) {
      inRange++;
    }
  }
  return inRange / speeds.length;
};

// スコアの重み
const ROUTE_FIT_WEIGHT = 0.5;
const ORDER_WEIGHT = 0.3;
const SPEED_WEIGHT = 0.2;

/**
 * 候補路線のスコアを計算する
 */
export const scoreLine = (
  candidate: CandidateLine,
  logs: FilteredLocationLog[]
): ScoredLine => {
  const routeFitScore = calcRouteFitScore(logs, candidate.stations);
  const visitedIndices = findNearestStationIndices(logs, candidate.stations);
  const orderScore = calcOrderScore(visitedIndices);
  const speedScore = calcSpeedScore(logs, candidate.line);

  const score =
    ROUTE_FIT_WEIGHT * routeFitScore +
    ORDER_WEIGHT * orderScore +
    SPEED_WEIGHT * speedScore;

  return {
    ...candidate,
    score,
    scoreBreakdown: { routeFitScore, orderScore, speedScore },
    visitedIndices,
  };
};

/**
 * 信頼度スコアを計算する
 */
export const calcConfidence = (
  scoredLine: ScoredLine,
  logs: FilteredLocationLog[]
): number => {
  // 路線近傍(500m以内)のログ点割合
  const stationCoords = scoredLine.stations
    .filter((s) => s.latitude != null && s.longitude != null)
    .map((s) => ({
      latitude: s.latitude as number,
      longitude: s.longitude as number,
    }));

  let nearbyCount = 0;
  for (const log of logs) {
    let isNearby = false;
    for (const sc of stationCoords) {
      const dist = getDistance(
        { latitude: log.latitude, longitude: log.longitude },
        sc
      );
      if (dist <= MAX_FIT_DISTANCE) {
        isNearby = true;
        break;
      }
    }
    if (isNearby) nearbyCount++;
  }
  const pointCoverage = logs.length > 0 ? nearbyCount / logs.length : 0;

  // ユニーク駅通過数
  const uniqueStations = new Set(scoredLine.visitedIndices).size;
  const stationFactor = Math.min(1.0, uniqueStations / 3);

  // 精度ファクター
  const accuracies = logs
    .map((l) => l.accuracy)
    .filter((a): a is number => a != null);
  const avgAccuracy =
    accuracies.length > 0
      ? accuracies.reduce((sum, a) => sum + a, 0) / accuracies.length
      : 100;
  const accuracyFactor =
    avgAccuracy < 50 ? 1.0 : avgAccuracy > 200 ? 0.5 : 0.75;

  return Math.min(
    1.0,
    scoredLine.score * pointCoverage * stationFactor * accuracyFactor
  );
};
