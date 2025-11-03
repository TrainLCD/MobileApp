import { generateAccuracyChart } from './accuracyChart';

describe('generateAccuracyChart', () => {
  it('should return empty array for empty history', () => {
    expect(generateAccuracyChart([])).toEqual([]);
  });

  it('should return same block for all identical values', () => {
    const result = generateAccuracyChart([100, 100, 100, 100]);
    expect(result).toHaveLength(4);
    expect(result.every((block) => block.char === '▄')).toBe(true);
  });

  it('should use taller blocks for higher (worse) accuracy values', () => {
    // Higher accuracy values (worse precision) should get taller blocks
    const result = generateAccuracyChart([100, 50, 10]);

    // Should have 3 blocks
    expect(result).toHaveLength(3);

    // First block (100m accuracy) should be tallest
    // Last block (10m accuracy) should be shortest
    const blocks = ['▇', '▆', '▅', '▄', '▃', '▂', '▁'];
    const firstChar = result[0].char;
    const lastChar = result[2].char;

    expect(blocks.indexOf(firstChar)).toBeLessThan(blocks.indexOf(lastChar));
  });

  it('should handle single value', () => {
    const result = generateAccuracyChart([50]);
    expect(result).toHaveLength(1);
    expect(result[0].char).toBe('▄');
  });

  it('should handle two values', () => {
    const result = generateAccuracyChart([100, 10]);
    expect(result).toHaveLength(2);

    // Higher value should have taller block
    const blocks = ['▇', '▆', '▅', '▄', '▃', '▂', '▁'];
    expect(blocks.indexOf(result[0].char)).toBeLessThan(
      blocks.indexOf(result[1].char)
    );
  });

  it('should handle typical accuracy progression', () => {
    // Simulate getting worse accuracy over time
    const result = generateAccuracyChart([10, 20, 40, 60, 80, 100]);

    expect(result).toHaveLength(6);

    // Should be an ascending pattern (visually going up since higher accuracy = taller block)
    // Indices should decrease as blocks get taller
    const blocks = ['▇', '▆', '▅', '▄', '▃', '▂', '▁'];
    for (let i = 0; i < result.length - 1; i++) {
      const currentIndex = blocks.indexOf(result[i].char);
      const nextIndex = blocks.indexOf(result[i + 1].char);
      // Each subsequent value should have a taller or same height block (lower or same index)
      expect(currentIndex).toBeGreaterThanOrEqual(nextIndex);
    }
  });

  it('should handle fluctuating accuracy', () => {
    const result = generateAccuracyChart([50, 100, 25, 75]);

    expect(result).toHaveLength(4);

    // Should use blocks based on relative values
    const blocks = ['▇', '▆', '▅', '▄', '▃', '▂', '▁'];

    // 100m (worst) should have tallest block
    const index100 = blocks.indexOf(result[1].char);
    // 25m (best) should have shortest block
    const index25 = blocks.indexOf(result[2].char);

    expect(index100).toBeLessThan(index25);
  });

  it('should handle 12 values (max history)', () => {
    const values = [10, 12, 15, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const result = generateAccuracyChart(values);

    expect(result).toHaveLength(12);

    // First value (10) should be shortest
    // Last value (100) should be tallest
    const blocks = ['▇', '▆', '▅', '▄', '▃', '▂', '▁'];
    expect(blocks.indexOf(result[0].char)).toBeGreaterThan(
      blocks.indexOf(result[11].char)
    );
  });

  it('should only use valid block characters', () => {
    const validBlocks = ['▇', '▆', '▅', '▄', '▃', '▂', '▁'];
    const result = generateAccuracyChart([
      10, 20, 30, 40, 50, 60, 70, 80, 90, 100,
    ]);

    for (const block of result) {
      expect(validBlocks).toContain(block.char);
    }
  });

  it('should filter out NaN values', () => {
    const result = generateAccuracyChart([10, Number.NaN, 50, 100]);
    // Should have 3 valid values
    expect(result).toHaveLength(3);
  });

  it('should filter out Infinity values', () => {
    const result = generateAccuracyChart([
      10,
      Number.POSITIVE_INFINITY,
      50,
      Number.NEGATIVE_INFINITY,
      100,
    ]);
    // Should have 3 valid values
    expect(result).toHaveLength(3);
  });

  it('should filter out negative values', () => {
    const result = generateAccuracyChart([10, -5, 50, -100, 100]);
    // Should have 3 valid values (10, 50, 100)
    expect(result).toHaveLength(3);
  });

  it('should return empty array when all values are invalid', () => {
    const result = generateAccuracyChart([
      Number.NaN,
      Number.POSITIVE_INFINITY,
      -10,
      Number.NEGATIVE_INFINITY,
    ]);
    expect(result).toEqual([]);
  });

  it('should handle mixed valid and invalid values', () => {
    const result = generateAccuracyChart([
      10,
      Number.NaN,
      50,
      Number.POSITIVE_INFINITY,
      100,
      -5,
    ]);
    // Should have 3 valid values
    expect(result).toHaveLength(3);

    const blocks = ['▇', '▆', '▅', '▄', '▃', '▂', '▁'];
    for (const block of result) {
      expect(blocks).toContain(block.char);
    }
  });

  describe('color coding', () => {
    it('should use red color for accuracy >= BAD_ACCURACY_THRESHOLD', () => {
      const result = generateAccuracyChart([200, 250, 300]);
      expect(result).toHaveLength(3);
      for (const block of result) {
        expect(block.color).toBe('#ff0000');
      }
    });

    it('should use yellow color for accuracy >= BAD_ACCURACY_THRESHOLD / 2 and < BAD_ACCURACY_THRESHOLD', () => {
      const result = generateAccuracyChart([100, 150, 199]);
      expect(result).toHaveLength(3);
      for (const block of result) {
        expect(block.color).toBe('#ffff00');
      }
    });

    it('should use white color for accuracy < BAD_ACCURACY_THRESHOLD / 2', () => {
      const result = generateAccuracyChart([10, 50, 99]);
      expect(result).toHaveLength(3);
      for (const block of result) {
        expect(block.color).toBe('#ffffff');
      }
    });

    it('should handle mixed accuracy values with different colors', () => {
      // Test with values in all three ranges
      const result = generateAccuracyChart([50, 150, 250]);
      expect(result).toHaveLength(3);

      // 50m should be white
      expect(result[0].color).toBe('#ffffff');
      // 150m should be yellow
      expect(result[1].color).toBe('#ffff00');
      // 250m should be red
      expect(result[2].color).toBe('#ff0000');
    });
  });
});
