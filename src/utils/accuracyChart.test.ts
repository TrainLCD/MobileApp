import * as remoteConfigModule from '../lib/remoteConfig';
import {
  ACCURACY_CHART_COLORS,
  ACCURACY_CHART_FLOOR_M,
  buildAccuracyChartSeries,
  getAccuracyChartCeiling,
  getAccuracyColor,
  normalizeAccuracy,
} from './accuracyChart';

// Remote Config 未設定時はフォールバック(1500m)が返るため、固定スケールの
// 上限はその値で評価される。
const ACCURACY_CHART_CEILING_M = getAccuracyChartCeiling();

describe('normalizeAccuracy (fixed log scale)', () => {
  it('maps the floor and below to 0', () => {
    expect(normalizeAccuracy(ACCURACY_CHART_FLOOR_M)).toBe(0);
    expect(normalizeAccuracy(0)).toBe(0);
    expect(normalizeAccuracy(ACCURACY_CHART_FLOOR_M - 1)).toBe(0);
  });

  it('maps the ceiling and above to 1', () => {
    expect(normalizeAccuracy(ACCURACY_CHART_CEILING_M)).toBe(1);
    expect(normalizeAccuracy(ACCURACY_CHART_CEILING_M + 500)).toBe(1);
  });

  it('is monotonically increasing with accuracy across the range', () => {
    const samples = [5, 10, 50, 200, 700, 1500];
    const normalized = samples.map(normalizeAccuracy);
    for (let i = 0; i < normalized.length - 1; i++) {
      expect(normalized[i]).toBeLessThan(normalized[i + 1]);
    }
  });

  it('keeps every result within [0, 1]', () => {
    for (const v of [0, 1, 5, 60, 199, 200, 1499, 1500, 5000]) {
      const n = normalizeAccuracy(v);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(1);
    }
  });

  it('spreads good-range jitter visibly (5m vs 60m differ clearly)', () => {
    // 相対スケールを廃したログ固定軸では良好域の変化も読み取れる
    expect(normalizeAccuracy(60) - normalizeAccuracy(5)).toBeGreaterThan(0.3);
  });

  it('degrades gracefully when the ceiling is at or below the floor', () => {
    // Remote Config で床値以下が設定された退化スケールでも NaN を出さず、
    // 床超えは上端(1)、床以下は下端(0)へ倒す
    const spy = jest
      .spyOn(remoteConfigModule, 'getMaxPermitAccuracy')
      .mockReturnValue(ACCURACY_CHART_FLOOR_M - 2);
    try {
      expect(normalizeAccuracy(ACCURACY_CHART_FLOOR_M + 100)).toBe(1);
      expect(normalizeAccuracy(ACCURACY_CHART_FLOOR_M)).toBe(0);
      expect(normalizeAccuracy(1)).toBe(0);
      expect(Number.isNaN(normalizeAccuracy(50))).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });
});

describe('buildAccuracyChartSeries', () => {
  it('should return empty array for empty history', () => {
    expect(buildAccuracyChartSeries([])).toEqual([]);
  });

  it('should keep one point per valid sample', () => {
    const result = buildAccuracyChartSeries([10, 20, 30, 40]);
    expect(result).toHaveLength(4);
    expect(result.map((point) => point.value)).toEqual([10, 20, 30, 40]);
  });

  it('positions each sample on the fixed scale, independent of the window', () => {
    // 同じ精度値は他のサンプルに依らず常に同じ高さに来る(可変スケールの撤廃)
    const alone = buildAccuracyChartSeries([50]);
    const withOthers = buildAccuracyChartSeries([10, 50, 1500]);
    expect(alone[0].normalized).toBe(normalizeAccuracy(50));
    expect(withOthers[1].normalized).toBe(normalizeAccuracy(50));
    expect(alone[0].normalized).toBe(withOthers[1].normalized);
  });

  it('does not collapse identical values to the middle', () => {
    // 旧実装は全同値で 0.5 を返していたが、固定スケールでは実際の位置を返す
    const result = buildAccuracyChartSeries([100, 100, 100, 100]);
    expect(result).toHaveLength(4);
    const expected = normalizeAccuracy(100);
    expect(result.every((point) => point.normalized === expected)).toBe(true);
    expect(result[0].normalized).not.toBe(0.5);
  });

  it('orders worse (higher) accuracy above better accuracy', () => {
    const result = buildAccuracyChartSeries([10, 100, 1000]);
    expect(result[0].normalized).toBeLessThan(result[1].normalized);
    expect(result[1].normalized).toBeLessThan(result[2].normalized);
  });

  it('should handle single value', () => {
    const result = buildAccuracyChartSeries([50]);
    expect(result).toHaveLength(1);
    expect(result[0].normalized).toBe(normalizeAccuracy(50));
    expect(result[0].value).toBe(50);
  });

  it('should filter out NaN values', () => {
    const result = buildAccuracyChartSeries([10, Number.NaN, 50, 100]);
    expect(result).toHaveLength(3);
    expect(result.map((point) => point.value)).toEqual([10, 50, 100]);
  });

  it('should filter out Infinity values', () => {
    const result = buildAccuracyChartSeries([
      10,
      Number.POSITIVE_INFINITY,
      50,
      Number.NEGATIVE_INFINITY,
      100,
    ]);
    expect(result).toHaveLength(3);
  });

  it('should filter out negative values', () => {
    const result = buildAccuracyChartSeries([10, -5, 50, -100, 100]);
    expect(result).toHaveLength(3);
    expect(result.map((point) => point.value)).toEqual([10, 50, 100]);
  });

  it('should return empty array when all values are invalid', () => {
    const result = buildAccuracyChartSeries([
      Number.NaN,
      Number.POSITIVE_INFINITY,
      -10,
      Number.NEGATIVE_INFINITY,
    ]);
    expect(result).toEqual([]);
  });

  it('should handle 12 values (max history)', () => {
    const values = [10, 12, 15, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const result = buildAccuracyChartSeries(values);
    expect(result).toHaveLength(12);
    // 単調増加の入力は単調増加の正規化位置になる
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].normalized).toBeLessThan(result[i + 1].normalized);
    }
  });

  describe('color coding', () => {
    it('should use danger color for accuracy > MAX_PERMIT_ACCURACY', () => {
      const result = buildAccuracyChartSeries([2001, 2500, 3000]);
      expect(result).toHaveLength(3);
      for (const point of result) {
        expect(point.color).toBe(ACCURACY_CHART_COLORS.danger);
      }
    });

    it('should use warning color for accuracy >= BAD_ACCURACY_THRESHOLD and <= MAX_PERMIT_ACCURACY', () => {
      const result = buildAccuracyChartSeries([200, 750, 1500]);
      expect(result).toHaveLength(3);
      for (const point of result) {
        expect(point.color).toBe(ACCURACY_CHART_COLORS.warning);
      }
    });

    it('should use good color for accuracy < BAD_ACCURACY_THRESHOLD', () => {
      const result = buildAccuracyChartSeries([10, 100, 199]);
      expect(result).toHaveLength(3);
      for (const point of result) {
        expect(point.color).toBe(ACCURACY_CHART_COLORS.good);
      }
    });

    it('should handle mixed accuracy values with different colors', () => {
      const result = buildAccuracyChartSeries([50, 500, 2500]);
      expect(result).toHaveLength(3);
      expect(result[0].color).toBe(ACCURACY_CHART_COLORS.good);
      expect(result[1].color).toBe(ACCURACY_CHART_COLORS.warning);
      expect(result[2].color).toBe(ACCURACY_CHART_COLORS.danger);
    });
  });
});

describe('getAccuracyColor', () => {
  it('returns danger over MAX_PERMIT_ACCURACY', () => {
    expect(getAccuracyColor(2000)).toBe(ACCURACY_CHART_COLORS.danger);
  });

  it('returns warning at the bad threshold boundary', () => {
    expect(getAccuracyColor(200)).toBe(ACCURACY_CHART_COLORS.warning);
  });

  it('returns good below the bad threshold', () => {
    expect(getAccuracyColor(199)).toBe(ACCURACY_CHART_COLORS.good);
  });
});
