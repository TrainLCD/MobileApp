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

  // Find min and max for normalization using reduce to avoid stack overflow
  const minAccuracy = accuracyHistory.reduce(
    (min, val) => (val < min ? val : min),
    accuracyHistory[0]
  );
  const maxAccuracy = accuracyHistory.reduce(
    (max, val) => (val > max ? val : max),
    accuracyHistory[0]
  );

  // If all values are the same, use middle block
  if (minAccuracy === maxAccuracy) {
    return blocks[3].repeat(accuracyHistory.length);
  }

  // Normalize and map to block characters
  // Lower accuracy (better) maps to taller blocks (index 0)
  // Higher accuracy (worse) maps to shorter blocks (index 6)
  return accuracyHistory
    .map((accuracy) => {
      // Lower accuracy values should map to lower indices (taller blocks)
      const normalized = (accuracy - minAccuracy) / (maxAccuracy - minAccuracy);
      const blockIndex = Math.floor(normalized * (blocks.length - 1));
      return blocks[blockIndex];
    })
    .join('');
};
