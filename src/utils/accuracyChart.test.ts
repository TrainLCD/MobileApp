import { generateAccuracyChart } from './accuracyChart';

describe('generateAccuracyChart', () => {
  it('should return empty string for empty history', () => {
    expect(generateAccuracyChart([])).toBe('');
  });

  it('should return same block for all identical values', () => {
    const result = generateAccuracyChart([100, 100, 100, 100]);
    expect(result).toBe('▄▄▄▄');
    expect(result).toHaveLength(4);
  });

  it('should use taller blocks for lower (better) accuracy values', () => {
    // Lower accuracy values (better precision) should get taller blocks
    const result = generateAccuracyChart([10, 50, 100]);

    // Should have 3 characters
    expect(result).toHaveLength(3);

    // First character (10m accuracy) should be tallest
    // Last character (100m accuracy) should be shortest
    const blocks = ['▇', '▆', '▅', '▄', '▃', '▂', '▁'];
    const firstChar = result[0];
    const lastChar = result[2];

    expect(blocks.indexOf(firstChar)).toBeLessThan(blocks.indexOf(lastChar));
  });

  it('should handle single value', () => {
    const result = generateAccuracyChart([50]);
    expect(result).toBe('▄');
    expect(result).toHaveLength(1);
  });

  it('should handle two values', () => {
    const result = generateAccuracyChart([10, 100]);
    expect(result).toHaveLength(2);

    // Lower value should have taller block
    const blocks = ['▇', '▆', '▅', '▄', '▃', '▂', '▁'];
    expect(blocks.indexOf(result[0])).toBeLessThan(blocks.indexOf(result[1]));
  });

  it('should handle typical accuracy progression', () => {
    // Simulate getting better accuracy over time
    const result = generateAccuracyChart([100, 80, 60, 40, 20, 10]);

    expect(result).toHaveLength(6);

    // Should be a descending pattern (visually going up since lower accuracy = taller block)
    const blocks = ['▇', '▆', '▅', '▄', '▃', '▂', '▁'];
    for (let i = 0; i < result.length - 1; i++) {
      const currentIndex = blocks.indexOf(result[i]);
      const nextIndex = blocks.indexOf(result[i + 1]);
      // Each subsequent value should have a taller or same height block
      expect(currentIndex).toBeGreaterThanOrEqual(nextIndex);
    }
  });

  it('should handle fluctuating accuracy', () => {
    const result = generateAccuracyChart([50, 100, 25, 75]);

    expect(result).toHaveLength(4);

    // Should use blocks based on relative values
    const blocks = ['▇', '▆', '▅', '▄', '▃', '▂', '▁'];

    // 25m (best) should have tallest block
    const index25 = blocks.indexOf(result[2]);
    // 100m (worst) should have shortest block
    const index100 = blocks.indexOf(result[1]);

    expect(index25).toBeLessThan(index100);
  });

  it('should handle 12 values (max history)', () => {
    const values = [100, 90, 80, 70, 60, 50, 40, 30, 20, 15, 12, 10];
    const result = generateAccuracyChart(values);

    expect(result).toHaveLength(12);

    // First value (100) should be shortest
    // Last value (10) should be tallest
    const blocks = ['▇', '▆', '▅', '▄', '▃', '▂', '▁'];
    expect(blocks.indexOf(result[0])).toBeGreaterThan(
      blocks.indexOf(result[11])
    );
  });

  it('should only use valid block characters', () => {
    const validBlocks = ['▇', '▆', '▅', '▄', '▃', '▂', '▁'];
    const result = generateAccuracyChart([
      10, 20, 30, 40, 50, 60, 70, 80, 90, 100,
    ]);

    for (const char of result) {
      expect(validBlocks).toContain(char);
    }
  });
});
