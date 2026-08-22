import { computeTwoLineTypography } from './computeTwoLineTypography';

describe('computeTwoLineTypography', () => {
  it('1行のときはbaseFontSizeをそのまま返し、lineHeightはundefined', () => {
    const result = computeTwoLineTypography({
      baseFontSize: 18,
      isTablet: false,
      numberOfLines: 1,
      prevNumberOfLines: 1,
    });
    expect(result.fontSize).toBe(18);
    expect(result.lineHeight).toBeUndefined();
    expect(result.prevFontSize).toBe(18);
    expect(result.prevLineHeight).toBeUndefined();
  });

  it('2行のときはfontSizeを0.7倍、lineHeightをfontSize×1.05に縮める', () => {
    const result = computeTwoLineTypography({
      baseFontSize: 18,
      isTablet: false,
      numberOfLines: 2,
      prevNumberOfLines: 2,
    });
    expect(result.fontSize).toBeCloseTo(18 * 0.7);
    expect(result.lineHeight).toBeCloseTo(18 * 0.7 * 1.05);
    expect(result.prevFontSize).toBeCloseTo(18 * 0.7);
    expect(result.prevLineHeight).toBeCloseTo(18 * 0.7 * 1.05);
  });

  it('isTablet=trueでフォントサイズを1.5倍する', () => {
    const result = computeTwoLineTypography({
      baseFontSize: 18,
      isTablet: true,
      numberOfLines: 1,
      prevNumberOfLines: 1,
    });
    expect(result.fontSize).toBe(18 * 1.5);
  });

  it('fontSizeScaleが指定されたときは効果的なベースに乗算される', () => {
    const result = computeTwoLineTypography({
      baseFontSize: 18,
      isTablet: false,
      fontSizeScale: 0.5,
      numberOfLines: 1,
      prevNumberOfLines: 1,
    });
    expect(result.fontSize).toBe(18 * 0.5);
  });

  it('maxHeight未指定なら従来通りクランプしない', () => {
    const result = computeTwoLineTypography({
      baseFontSize: 18,
      isTablet: false,
      fontSizeScale: 1.2,
      numberOfLines: 2,
      prevNumberOfLines: 2,
    });
    expect(result.lineHeight).toBeCloseTo(18 * 1.2 * 0.7 * 1.05);
  });

  it('2行分の行送りがmaxHeightを超えるときはfontSizeとlineHeightを縮める', () => {
    // 小田急テーマ(fontSizeScale 1.2)のスマホ実寸。
    // クランプなしでは 15.876 * 2 = 31.752 > 30.25 となり箱に収まらない。
    const maxHeight = 30.25;
    const result = computeTwoLineTypography({
      baseFontSize: 18,
      isTablet: false,
      fontSizeScale: 1.2,
      numberOfLines: 2,
      prevNumberOfLines: 2,
      maxHeight,
    });

    expect(result.lineHeight).toBeCloseTo(maxHeight / 2);
    expect((result.lineHeight as number) * 2).toBeLessThanOrEqual(maxHeight);
    expect(result.fontSize).toBeCloseTo(maxHeight / 2 / 1.05);
    expect(result.fontSize).toBeLessThan(18 * 1.2 * 0.7);
    expect((result.prevLineHeight as number) * 2).toBeLessThanOrEqual(
      maxHeight
    );
  });

  it('2行分の行送りがmaxHeightに収まるときは縮めない', () => {
    const result = computeTwoLineTypography({
      baseFontSize: 18,
      isTablet: false,
      numberOfLines: 2,
      prevNumberOfLines: 2,
      maxHeight: 30.25,
    });
    expect(result.fontSize).toBeCloseTo(18 * 0.7);
    expect(result.lineHeight).toBeCloseTo(18 * 0.7 * 1.05);
  });

  it('1行のときはmaxHeightを指定してもlineHeightを付けない', () => {
    const result = computeTwoLineTypography({
      baseFontSize: 18,
      isTablet: false,
      fontSizeScale: 1.2,
      numberOfLines: 1,
      prevNumberOfLines: 1,
      maxHeight: 30.25,
    });
    expect(result.fontSize).toBeCloseTo(18 * 1.2);
    expect(result.lineHeight).toBeUndefined();
  });

  it('currentとprevで異なるnumberOfLinesに対応する', () => {
    const result = computeTwoLineTypography({
      baseFontSize: 21,
      isTablet: true,
      numberOfLines: 2,
      prevNumberOfLines: 1,
    });
    const base = 21 * 1.5;
    expect(result.fontSize).toBeCloseTo(base * 0.7);
    expect(result.lineHeight).toBeCloseTo(base * 0.7 * 1.05);
    expect(result.prevFontSize).toBe(base);
    expect(result.prevLineHeight).toBeUndefined();
  });
});
