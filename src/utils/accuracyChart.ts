import { BAD_ACCURACY_THRESHOLD } from '../constants/threshold';
import { getMaxPermitAccuracy } from '../lib/remoteConfig';

/** 折れ線グラフ上の 1 サンプルを表す点。 */
export type AccuracyChartPoint = {
  /** 測位精度(m)。小さいほど高精度。 */
  value: number;
  /**
   * 精度を 0..1 の固定スケール上の位置へ変換した値。
   * 履歴ウィンドウの min/max には依存せず、同じ精度値は常に同じ位置に来る。
   * 1 が最も精度が悪い(上端)、0 が最も精度が良い(下端)。
   * @see normalizeAccuracy
   */
  normalized: number;
  /** 精度帯に応じた線・点の表示色。 */
  color: string;
};

/**
 * 縦軸固定スケールの下限(m)。これ以下の高精度は下端(0)に張り付く。
 * GPS の実用的な最良精度域(数 m)を踏まえた値。
 */
export const ACCURACY_CHART_FLOOR_M = 5;
/**
 * 縦軸固定スケールの上限(m)。これ以上は上端(1)にクランプする。
 * 許容上限(最大許容精度)を超えた測位はフィルタで棄却される域なので、
 * それ以降を区別する意味は薄く、上端に張り付かせて「振り切れ」を示す。
 * 上限は Remote Config 由来の最大許容精度に追従させ、フィルタ本体と軸をそろえる。
 */
export const getAccuracyChartCeiling = (): number => getMaxPermitAccuracy();

/**
 * 精度帯ごとの折れ線・点の表示色。DevOverlay のメトリクスカード配色と揃え、
 * 数値表示とグラフで同じ警告レベルが読み取れるようにする。
 */
export const ACCURACY_CHART_COLORS = {
  good: '#38bdf8', // sky: BAD_ACCURACY_THRESHOLD 未満の良好域
  warning: '#facc15', // yellow: BAD_ACCURACY_THRESHOLD 以上・最大許容精度 以下
  danger: '#f87171', // red: 最大許容精度 超過(フィルタで棄却される域)
} as const;

/**
 * Determines the color of a chart point based on accuracy value
 * @param accuracy Accuracy value in meters
 * @returns Color string for the point
 */
export const getAccuracyColor = (accuracy: number): string => {
  // 最大許容精度を超えた測位値はフィルタで棄却されるため、DevOverlayの
  // メトリクスカード(isAccuracyOverLimit)と揃えて赤で警告する。許容値は
  // Remote Config 由来のため、フィルタ本体と同じ実効値で判定をそろえる。
  if (accuracy > getMaxPermitAccuracy()) {
    return ACCURACY_CHART_COLORS.danger;
  }
  if (accuracy >= BAD_ACCURACY_THRESHOLD) {
    return ACCURACY_CHART_COLORS.warning;
  }
  return ACCURACY_CHART_COLORS.good;
};

const LOG_FLOOR = Math.log(ACCURACY_CHART_FLOOR_M);

/**
 * Maps an accuracy value (m) to a fixed 0..1 position on a logarithmic scale.
 * The scale is anchored to constant floor/ceiling bounds (not the history
 * window) so the same accuracy always lands at the same height and the
 * magnitude of a change is directly readable. A log axis keeps both
 * good-range jitter (e.g. 5m↔60m) and large degradations (hundreds of m)
 * legible despite GPS accuracy spanning several orders of magnitude.
 * 1 = worst (ceiling and above), 0 = best (floor and below).
 * @param accuracy Accuracy value in meters
 * @returns Normalized position clamped to [0, 1]
 */
export const normalizeAccuracy = (accuracy: number): number => {
  // 上限は Remote Config 由来の最大許容精度に追従するため、対数スパンも都度算出する。
  const ceiling = getAccuracyChartCeiling();
  const logSpan = Math.log(ceiling) - LOG_FLOOR;
  const clamped = Math.min(ceiling, Math.max(ACCURACY_CHART_FLOOR_M, accuracy));
  return (Math.log(clamped) - LOG_FLOOR) / logSpan;
};

/**
 * Builds a normalized series for the accuracy history line chart.
 * Invalid samples (NaN, Infinity, negative numbers) are dropped so that a
 * stalled GPS makes the line visibly thin out instead of drawing bogus points.
 * Each sample is positioned on a fixed logarithmic scale (see normalizeAccuracy)
 * independently of the others, so the chart is both window- and
 * rendering-size agnostic; callers map the 0..1 `normalized` value onto pixels.
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

  return validHistory.map((value) => ({
    value,
    normalized: normalizeAccuracy(value),
    color: getAccuracyColor(value),
  }));
};
