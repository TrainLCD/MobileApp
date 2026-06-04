import {
  ACCURACY_CHART_COLORS,
  buildAccuracyChartSeries,
  getAccuracyColor,
} from './accuracyChart';

describe('buildAccuracyChartSeries', () => {
  it('should return empty array for empty history', () => {
    expect(buildAccuracyChartSeries([])).toEqual([]);
  });

  it('should keep one point per valid sample', () => {
    const result = buildAccuracyChartSeries([10, 20, 30, 40]);
    expect(result).toHaveLength(4);
    expect(result.map((point) => point.value)).toEqual([10, 20, 30, 40]);
  });

  it('should normalize worst (highest) accuracy to 1 and best to 0', () => {
    const result = buildAccuracyChartSeries([10, 100, 55]);
    // 10m が最良(0)、100m が最悪(1)
    expect(result[0].normalized).toBe(0);
    expect(result[1].normalized).toBe(1);
    // 中間値は 0..1 の範囲に収まる
    expect(result[2].normalized).toBeGreaterThan(0);
    expect(result[2].normalized).toBeLessThan(1);
  });

  it('should return middle (0.5) normalization for identical values', () => {
    const result = buildAccuracyChartSeries([100, 100, 100, 100]);
    expect(result).toHaveLength(4);
    expect(result.every((point) => point.normalized === 0.5)).toBe(true);
  });

  it('should handle single value', () => {
    const result = buildAccuracyChartSeries([50]);
    expect(result).toHaveLength(1);
    expect(result[0].normalized).toBe(0.5);
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
    // 最初(10m)が最良で 0、最後(100m)が最悪で 1
    expect(result[0].normalized).toBe(0);
    expect(result[11].normalized).toBe(1);
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
