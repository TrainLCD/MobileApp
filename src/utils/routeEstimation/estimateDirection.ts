import type { Station } from '~/@types/graphql';
import {
  MEIJO_LINE_ID,
  OSAKA_LOOP_LINE_ID,
  TOEI_OEDO_LINE_ID,
  YAMANOTE_LINE_ID,
} from '~/constants/line';
import type { LineDirection } from '~/models/Bound';
import getIsPass from '~/utils/isPass';
import { deduplicate } from './scoreLine';
import type { ScoredLine } from './types';

const LOOP_LINE_IDS = new Set([
  YAMANOTE_LINE_ID,
  OSAKA_LOOP_LINE_ID,
  MEIJO_LINE_ID,
  TOEI_OEDO_LINE_ID,
]);

/**
 * 単純線形回帰の傾きを返す
 */
const linearSlope = (values: number[]): number => {
  const n = values.length;
  if (n < 2) return 0;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
};

/**
 * 環状線の方向推定: wrap-aroundを考慮した最短弧方向
 */
const estimateLoopDirection = (
  visitedIndices: number[],
  totalStations: number
): LineDirection => {
  const deduped = deduplicate(visitedIndices);
  if (deduped.length < 2) return 'INBOUND';

  let forwardSteps = 0;
  let backwardSteps = 0;

  for (let i = 0; i < deduped.length - 1; i++) {
    const diff = deduped[i + 1] - deduped[i];
    // wrap-aroundを考慮: 正方向の距離と逆方向の距離を比較
    const forwardDist = diff >= 0 ? diff : totalStations + diff;
    const backwardDist = diff <= 0 ? -diff : totalStations - diff;

    if (forwardDist <= backwardDist) {
      forwardSteps++;
    } else {
      backwardSteps++;
    }
  }

  return forwardSteps >= backwardSteps ? 'INBOUND' : 'OUTBOUND';
};

/**
 * 通常路線の方向推定: インデックス列の線形回帰の傾き
 */
const estimateLinearDirection = (visitedIndices: number[]): LineDirection => {
  const deduped = deduplicate(visitedIndices);
  const slope = linearSlope(deduped);
  return slope >= 0 ? 'INBOUND' : 'OUTBOUND';
};

export type DirectionEstimate = {
  direction: LineDirection;
  currentStation: Station;
  nextStation: Station;
  boundStation: Station;
  /** 方向に沿って並べた駅リスト */
  orderedStations: Station[];
};

/**
 * スコア付き路線から方向・現在駅・次駅・行先を推定する
 */
export const estimateDirection = (
  scoredLine: ScoredLine
): DirectionEstimate | null => {
  const { stations, visitedIndices, line } = scoredLine;

  if (stations.length === 0 || visitedIndices.length === 0) {
    return null;
  }

  const lineId = line.id;
  const isLoop = lineId != null && LOOP_LINE_IDS.has(lineId);

  const direction = isLoop
    ? estimateLoopDirection(visitedIndices, stations.length)
    : estimateLinearDirection(visitedIndices);

  // 方向に基づいて駅リストを並べる
  // INBOUND: 駅リストそのまま（インデックス昇順方向）
  // OUTBOUND: 駅リストを反転（インデックス降順方向）
  const orderedStations =
    direction === 'INBOUND' ? [...stations] : [...stations].reverse();

  // 最新ログ点の最寄り駅インデックス → 現在駅
  const latestIdx = visitedIndices[visitedIndices.length - 1];
  const currentStation = stations[latestIdx] ?? stations[0];

  // 方向に沿った次の停車駅を見つける
  const currentOrderedIdx = orderedStations.findIndex(
    (s) => s.id === currentStation.id
  );

  let nextStation = currentStation;
  for (let i = currentOrderedIdx + 1; i < orderedStations.length; i++) {
    if (!getIsPass(orderedStations[i])) {
      nextStation = orderedStations[i];
      break;
    }
  }

  // 行先 = 方向の終端駅（通過駅でない最後の駅）
  let boundStation = orderedStations[orderedStations.length - 1];
  for (let i = orderedStations.length - 1; i >= 0; i--) {
    if (!getIsPass(orderedStations[i])) {
      boundStation = orderedStations[i];
      break;
    }
  }

  return {
    direction,
    currentStation,
    nextStation,
    boundStation,
    orderedStations,
  };
};
