import { getLuminance } from 'polished';

const DEFAULT_TRAIN_TYPE_COLOR = '#008ffe';

/**
 * 列車種別の背景色を正規化し、無効な値にはデフォルト色を返す。
 */
export const normalizeTrainTypeColor = (color: string | undefined): string => {
  const bgColor = color || DEFAULT_TRAIN_TYPE_COLOR;
  try {
    getLuminance(bgColor);
    return bgColor;
  } catch {
    return DEFAULT_TRAIN_TYPE_COLOR;
  }
};

/**
 * 列車種別の背景色に対して読みやすいテキスト色を返す。
 * 明るい背景には暗いテキスト、暗い背景には白テキスト。
 */
export const getTrainTypeTextColor = (
  backgroundColor: string | undefined
): string => {
  const bgColor = normalizeTrainTypeColor(backgroundColor);
  try {
    return getLuminance(bgColor) > 0.4 ? '#333' : '#fff';
  } catch {
    return '#fff';
  }
};
