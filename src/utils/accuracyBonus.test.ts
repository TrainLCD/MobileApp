import { getAccuracyBonus } from './accuracyBonus';

describe('getAccuracyBonus', () => {
  it('精度の半分を補正として返す', () => {
    expect(getAccuracyBonus(100)).toBe(50);
  });

  // 上限はリテラルで固定する。実装側の定数と突き合わせるとトートロジーになり、
  // 上限を 150m から動かしてもテストが通ってしまう。
  it('補正の上限は150mで、精度300mで頭打ちになる', () => {
    // 頭打ちの境界(精度300m → 半分が上限ちょうど)
    expect(getAccuracyBonus(300)).toBe(150);
    // 境界の手前では半分のまま
    expect(getAccuracyBonus(299)).toBe(149.5);
    // 地下の粗い測位でも上限を超えない
    expect(getAccuracyBonus(2000)).toBe(150);
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
