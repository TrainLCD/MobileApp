import { BAD_ACCURACY_THRESHOLD } from '../constants/threshold';

export type AccuracyBlock = {
  char: string;
  color: string;
};

/**
 * Determines the color of an accuracy block based on accuracy value
 * @param accuracy Accuracy value in meters
 * @returns Color string for the block
 */
const getAccuracyColor = (accuracy: number): string => {
  if (accuracy >= BAD_ACCURACY_THRESHOLD) {
    return '#ff0000'; // red
  }
  if (accuracy >= BAD_ACCURACY_THRESHOLD / 2) {
    return '#ffff00'; // yellow
  }
  return '#ffffff'; // white
};

/**
 * Generates an ASCII bar chart from accuracy values
 * Uses block characters to represent accuracy levels
 * Higher accuracy values (worse) produce taller bars
 * @param accuracyHistory Array of accuracy values in meters
 * @returns Array of accuracy blocks with color information
 */
export const generateAccuracyChart = (
  accuracyHistory: number[]
): AccuracyBlock[] => {
  if (accuracyHistory.length === 0) {
    return [];
  }

  // Block characters from tallest to shortest
  const blocks = ['▇', '▆', '▅', '▄', '▃', '▂', '▁'];

  // Filter out invalid values (NaN, Infinity, negative numbers)
  const validHistory = accuracyHistory.filter(
    (val) => Number.isFinite(val) && val >= 0
  );

  // Return empty array if no valid values
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

  // If all values are the same, use middle block
  if (minAccuracy === maxAccuracy) {
    return validHistory.map((accuracy) => ({
      char: blocks[3],
      color: getAccuracyColor(accuracy),
    }));
  }

  // Normalize and map to block characters
  // Higher accuracy values (worse) map to taller blocks (index 0)
  // Lower accuracy (better) maps to shorter blocks (index 6)
  return validHistory.map((accuracy) => {
    // Higher accuracy values should map to lower indices (taller blocks)
    // So we invert the normalization
    const denominator = maxAccuracy - minAccuracy;
    const normalized =
      denominator > 0
        ? Math.max(0, Math.min(1, (maxAccuracy - accuracy) / denominator))
        : 0.5;
    const blockIndex = Math.floor(normalized * (blocks.length - 1));
    // Ensure blockIndex is within bounds
    const safeIndex = Math.max(0, Math.min(blocks.length - 1, blockIndex));
    return {
      char: blocks[safeIndex] || blocks[3],
      color: getAccuracyColor(accuracy),
    };
  });
};
