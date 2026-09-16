/** GPS精度に応じた閾値補正の上限(m) */
export const MAX_ACCURACY_BONUS = 150;

/**
 * GPS精度に応じて到着圏・接近圏へ加える補正(m)を返す。
 * 精度が悪い場合は判定圏を広げることで検知漏れを減らす。
 *
 * 判定(useRefreshStation)とDevOverlayの診断表示が同じ値を使うための共有関数。
 * 呼び出し側で式を組み直すと、実効閾値として持ち出した値が実際の判定と食い違う。
 */
export const getAccuracyBonus = (
  accuracy: number | null | undefined
): number => {
  if (accuracy == null || !Number.isFinite(accuracy) || accuracy <= 0) {
    return 0;
  }
  return Math.min(accuracy * 0.5, MAX_ACCURACY_BONUS);
};
