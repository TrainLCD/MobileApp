import { getAccuracyBonus, MAX_ACCURACY_BONUS } from './accuracyBonus';

describe('getAccuracyBonus', () => {
  it('精度の半分を補正として返す', () => {
    expect(getAccuracyBonus(100)).toBe(50);
  });

  it('上限で頭打ちになる', () => {
    // 地下の粗い測位(精度2000m)でも、判定圏が無制限に広がらないようにする
    expect(getAccuracyBonus(2000)).toBe(MAX_ACCURACY_BONUS);
    expect(getAccuracyBonus(300)).toBe(MAX_ACCURACY_BONUS);
  });

  it('精度が無い・不正・非正の値では補正しない', () => {
    expect(getAccuracyBonus(null)).toBe(0);
    expect(getAccuracyBonus(undefined)).toBe(0);
    expect(getAccuracyBonus(Number.NaN)).toBe(0);
    expect(getAccuracyBonus(Number.POSITIVE_INFINITY)).toBe(0);
    expect(getAccuracyBonus(0)).toBe(0);
    expect(getAccuracyBonus(-1)).toBe(0);
  });
});
