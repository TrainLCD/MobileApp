/**
 * Generates an ASCII bar chart from accuracy values
 * Uses block characters to represent accuracy levels
 * Lower accuracy values (better) produce taller bars
 * @param accuracyHistory Array of accuracy values in meters
 * @returns ASCII bar chart string using block characters
 */
export const generateAccuracyChart = (accuracyHistory: number[]): string => {
  if (accuracyHistory.length === 0) {
    return '';
  }

  // Block characters from tallest to shortest
  const blocks = ['▇', '▆', '▅', '▄', '▃', '▂', '▁'];

  // Filter out invalid values (NaN, Infinity, negative numbers)
  const validHistory = accuracyHistory.filter(
    (val) => Number.isFinite(val) && val >= 0
  );

  // Return empty string if no valid values
  if (validHistory.length === 0) {
    return '';
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

  // If all values are the same, use middle block
  if (minAccuracy === maxAccuracy) {
    return blocks[3].repeat(validHistory.length);
  }

  // Normalize and map to block characters
  // Lower accuracy (better) maps to taller blocks (index 0)
  // Higher accuracy (worse) maps to shorter blocks (index 6)
  return validHistory
    .map((accuracy) => {
      // Lower accuracy values should map to lower indices (taller blocks)
      const denominator = maxAccuracy - minAccuracy;
      const normalized =
        denominator > 0
          ? Math.max(0, Math.min(1, (accuracy - minAccuracy) / denominator))
          : 0.5;
      const blockIndex = Math.floor(normalized * (blocks.length - 1));
      // Ensure blockIndex is within bounds
      const safeIndex = Math.max(0, Math.min(blocks.length - 1, blockIndex));
      return blocks[safeIndex] || blocks[3];
    })
    .join('');
};
