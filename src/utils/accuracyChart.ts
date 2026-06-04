import { MAX_PERMIT_ACCURACY } from '../constants/location';
import { BAD_ACCURACY_THRESHOLD } from '../constants/threshold';

/** 折れ線グラフ上の 1 サンプルを表す点。 */
export type AccuracyChartPoint = {
  /** 測位精度(m)。小さいほど高精度。 */
  value: number;
  /**
   * 系列内の相対位置を 0..1 に正規化した値。
   * 1 が系列中で最も精度が悪い(値が大きい)サンプル、0 が最も精度が良い(値が小さい)サンプル。
   * 全サンプルが同値の場合は中央の 0.5 を返す。
   */
  normalized: number;
  /** 精度帯に応じた線・点の表示色。 */
  color: string;
};

/**
 * 精度帯ごとの折れ線・点の表示色。DevOverlay のメトリクスカード配色と揃え、
 * 数値表示とグラフで同じ警告レベルが読み取れるようにする。
 */
export const ACCURACY_CHART_COLORS = {
  good: '#38bdf8', // sky: BAD_ACCURACY_THRESHOLD 未満の良好域
  warning: '#facc15', // yellow: BAD_ACCURACY_THRESHOLD 以上・MAX_PERMIT_ACCURACY 以下
  danger: '#f87171', // red: MAX_PERMIT_ACCURACY 超過(フィルタで棄却される域)
} as const;

/**
 * Determines the color of a chart point based on accuracy value
 * @param accuracy Accuracy value in meters
 * @returns Color string for the point
 */
export const getAccuracyColor = (accuracy: number): string => {
  // 最大許容精度(MAX_PERMIT_ACCURACY)を超えた測位値はフィルタで棄却されるため、
  // DevOverlayのメトリクスカード(isAccuracyOverLimit)と揃えて赤で警告する。
  if (accuracy > MAX_PERMIT_ACCURACY) {
    return ACCURACY_CHART_COLORS.danger;
  }
  if (accuracy >= BAD_ACCURACY_THRESHOLD) {
    return ACCURACY_CHART_COLORS.warning;
  }
  return ACCURACY_CHART_COLORS.good;
};

/**
 * Builds a normalized series for the accuracy history line chart.
 * Invalid samples (NaN, Infinity, negative numbers) are dropped so that a
 * stalled GPS makes the line visibly thin out instead of drawing bogus points.
 * The series is normalization-only and rendering-size agnostic; callers map the
 * 0..1 `normalized` value onto pixel coordinates.
 * @param accuracyHistory Array of accuracy values in meters
 * @returns Array of chart points with normalized position and color
 */
export const buildAccuracyChartSeries = (
  accuracyHistory: number[]
): AccuracyChartPoint[] => {
  // Filter out invalid values (NaN, Infinity, negative numbers)
  const validHistory = accuracyHistory.filter(
    (val) => Number.isFinite(val) && val >= 0
  );

  if (validHistory.length === 0) {
    return [];
  }

  // Find min and max for normalization using reduce to avoid stack overflow
  const minAccuracy = validHistory.reduce(
    (min, val) => (val < min ? val : min),
    validHistory[0]
  );
  const maxAccuracy = validHistory.reduce(
    (max, val) => (val > max ? val : max),
    validHistory[0]
  );
  const range = maxAccuracy - minAccuracy;

  // normalized: 値が大きい(精度が悪い)ほど 1 に近づける。
  // 全サンプルが同値で range が 0 のときは中央(0.5)に揃える。
  return validHistory.map((value) => ({
    value,
    normalized: range > 0 ? (value - minAccuracy) / range : 0.5,
    color: getAccuracyColor(value),
  }));
};
