import { getLuminance } from 'polished';

/**
 * 列車種別の背景色に対して読みやすいテキスト色を返す。
 * 明るい背景には暗いテキスト、暗い背景には白テキスト。
 */
export const getTrainTypeTextColor = (
  backgroundColor: string | undefined
): string => {
  const bgColor = backgroundColor || '#008ffe';
  try {
    return getLuminance(bgColor) > 0.4 ? '#333' : '#fff';
  } catch {
    return '#fff';
  }
};
