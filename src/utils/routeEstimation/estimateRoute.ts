import { LineType } from '~/@types/graphql';
import { estimateDirection } from './estimateDirection';
import { getMedianSpeed } from './preprocessLogs';
import { calcConfidence, scoreLine } from './scoreLine';
import type {
  CandidateLine,
  FilteredLocationLog,
  RouteCandidate,
} from './types';

// 信頼度の最小閾値
const MIN_CONFIDENCE = 0.6;
// 最大候補数
const MAX_CANDIDATES = 3;

/**
 * 速度ベースの事前フィルタ: lineTypeで候補を絞り込む
 */
export const filterBySpeed = (
  candidates: CandidateLine[],
  logs: FilteredLocationLog[]
): CandidateLine[] => {
  const medianSpeed = getMedianSpeed(logs);

  // 新幹線速度域
  if (medianSpeed > 50) {
    const bulletTrains = candidates.filter(
      (c) => c.line.lineType === LineType.BulletTrain
    );
    return bulletTrains.length > 0 ? bulletTrains : candidates;
  }

  // 低速（路面電車・バス域）
  if (medianSpeed < 5) {
    const slowLines = candidates.filter(
      (c) =>
        c.line.lineType === LineType.Tram ||
        c.line.lineType === LineType.OtherLineType
    );
    return slowLines.length > 0 ? slowLines : candidates;
  }

  // 通常速度域: 新幹線を除外（全候補が新幹線の場合はフォールバック）
  const nonBullet = candidates.filter(
    (c) => c.line.lineType !== LineType.BulletTrain
  );
  return nonBullet.length > 0 ? nonBullet : candidates;
};

/**
 * 候補路線をスコアリングし、信頼度が閾値を超えるものを上位N件返す
 */
export const estimateRoutes = (
  candidates: CandidateLine[],
  logs: FilteredLocationLog[]
): RouteCandidate[] => {
  if (candidates.length === 0 || logs.length === 0) {
    return [];
  }

  // 速度ベースの事前フィルタ
  const filtered = filterBySpeed(candidates, logs);

  // 各候補路線をスコアリング
  const scored = filtered.map((c) => scoreLine(c, logs));

  // スコア降順でソート
  scored.sort((a, b) => b.score - a.score);

  // 方向推定 + 信頼度計算 → 最終候補生成
  const results: RouteCandidate[] = [];

  for (const sl of scored) {
    if (results.length >= MAX_CANDIDATES) break;

    const dirEstimate = estimateDirection(sl);
    if (!dirEstimate) continue;

    const confidence = calcConfidence(sl, logs);
    if (confidence < MIN_CONFIDENCE) continue;

    results.push({
      line: sl.line,
      direction: dirEstimate.direction,
      currentStation: dirEstimate.currentStation,
      nextStation: dirEstimate.nextStation,
      boundStation: dirEstimate.boundStation,
      stations: dirEstimate.orderedStations,
      score: sl.score,
      confidence,
      scoreBreakdown: sl.scoreBreakdown,
    });
  }

  return results;
};
