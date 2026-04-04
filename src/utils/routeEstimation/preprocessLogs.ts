import getDistance from 'geolib/es/getDistance';
import { MAX_PERMIT_ACCURACY } from '~/constants/location';
import type { FilteredLocationLog, LocationLog } from './types';

// 物理的にありえない速度でのジャンプを棄却する閾値(m/s ≒ 360km/h)
const MAX_PLAUSIBLE_SPEED = 100;
// 推定開始に必要な最小移動距離 (m)
const MIN_TRAVEL_DISTANCE = 200;
// 推定開始に必要な最小平均速度 (m/s)
const MIN_AVG_SPEED = 2;
// ログバッファの最大保持期間 (ms)
export const BUFFER_MAX_AGE_MS = 120_000;
// 再評価に必要な最小ポイント数
export const MIN_POINTS_FOR_ESTIMATION = 5;

/**
 * ログバッファに新しいポイントを追加し、古いポイントを除去する
 * 異常値（低精度・速度ジャンプ）を除外する
 */
export const appendToBuffer = (
  buffer: LocationLog[],
  newPoint: LocationLog
): LocationLog[] => {
  // 低精度ポイントを除去
  if (newPoint.accuracy != null && newPoint.accuracy > MAX_PERMIT_ACCURACY) {
    return buffer;
  }

  // 速度ジャンプを検出して棄却
  if (buffer.length > 0) {
    const prev = buffer[buffer.length - 1];
    const dt = (newPoint.timestamp - prev.timestamp) / 1000;
    if (dt > 0) {
      const dist = getDistance(
        { latitude: prev.latitude, longitude: prev.longitude },
        { latitude: newPoint.latitude, longitude: newPoint.longitude }
      );
      const speed = dist / dt;
      if (speed > MAX_PLAUSIBLE_SPEED) {
        return buffer;
      }
    }
  }

  // 古いポイントを除去してから追加
  const cutoff = newPoint.timestamp - BUFFER_MAX_AGE_MS;
  const trimmed = buffer.filter((p) => p.timestamp >= cutoff);
  return [...trimmed, newPoint];
};

/**
 * バッファ内のログを前処理し、各ポイント間の距離・時間差を計算する
 */
export const preprocessLogs = (
  buffer: LocationLog[]
): FilteredLocationLog[] => {
  if (buffer.length < 2) {
    return [];
  }

  const result: FilteredLocationLog[] = [
    {
      ...buffer[0],
      distFromPrev: 0,
      dtFromPrev: 0,
    },
  ];

  for (let i = 1; i < buffer.length; i++) {
    const prev = buffer[i - 1];
    const curr = buffer[i];
    const dist = getDistance(
      { latitude: prev.latitude, longitude: prev.longitude },
      { latitude: curr.latitude, longitude: curr.longitude }
    );
    const dt = (curr.timestamp - prev.timestamp) / 1000;

    result.push({
      ...curr,
      distFromPrev: dist,
      dtFromPrev: dt,
    });
  }

  return result;
};

/** バッファ内の総移動距離を計算する (m) */
export const getTotalDistance = (logs: FilteredLocationLog[]): number =>
  logs.reduce((sum, l) => sum + l.distFromPrev, 0);

/** バッファ内の平均速度を計算する (m/s) */
export const getAvgSpeed = (logs: FilteredLocationLog[]): number => {
  if (logs.length < 2) return 0;
  const totalDist = getTotalDistance(logs);
  const totalTime =
    (logs[logs.length - 1].timestamp - logs[0].timestamp) / 1000;
  return totalTime > 0 ? totalDist / totalTime : 0;
};

/** バッファ内の速度中央値を計算する (m/s) */
export const getMedianSpeed = (logs: FilteredLocationLog[]): number => {
  const speeds = logs
    .filter((l) => l.dtFromPrev > 0)
    .map((l) => l.distFromPrev / l.dtFromPrev);
  if (speeds.length === 0) return 0;
  speeds.sort((a, b) => a - b);
  const mid = Math.floor(speeds.length / 2);
  return speeds.length % 2 === 0
    ? (speeds[mid - 1] + speeds[mid]) / 2
    : speeds[mid];
};

/** 移動中かどうかを判定する */
export const isMoving = (logs: FilteredLocationLog[]): boolean => {
  const totalDist = getTotalDistance(logs);
  const avgSpeed = getAvgSpeed(logs);
  return totalDist >= MIN_TRAVEL_DISTANCE && avgSpeed >= MIN_AVG_SPEED;
};

/** 乗り換え（停車）を検知する: 速度 < 1 m/s が10秒以上 */
export const isTransferStop = (logs: FilteredLocationLog[]): boolean => {
  if (logs.length < 2) return false;

  const STOP_SPEED_THRESHOLD = 1; // m/s
  const STOP_DURATION_THRESHOLD = 10_000; // ms

  let stopStart: number | null = null;

  // index=0はdistFromPrev=0,dtFromPrev=0のため常にspeed=0になる（前処理の仕様）。
  // これを含めると停車タイマーが常に即座に開始され、低速移動時に偽陽性が発生するためスキップする。
  for (let i = 1; i < logs.length; i++) {
    const log = logs[i];
    const speed = log.dtFromPrev > 0 ? log.distFromPrev / log.dtFromPrev : 0;
    if (speed < STOP_SPEED_THRESHOLD) {
      if (stopStart == null) {
        stopStart = log.timestamp;
      } else if (log.timestamp - stopStart >= STOP_DURATION_THRESHOLD) {
        return true;
      }
    } else {
      stopStart = null;
    }
  }

  return false;
};
