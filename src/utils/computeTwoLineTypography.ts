// 改行入り種別ラベル(numberOfLines=2)が箱の高さに収まらない問題を回避するため、
// 2行レイアウト時にフォントサイズを縮め、行間を詰めて収まるサイズへ調整する。
// TrainTypeBox / TrainTypeBoxSaikyo / TrainTypeBoxJRKyushu で同じ計算を共有する。

const TABLET_FONT_MULTIPLIER = 1.5;
const TWO_LINE_FONT_SCALE = 0.7;
const TWO_LINE_LINE_HEIGHT_MULTIPLIER = 1.05;

export type TwoLineTypographyArgs = {
  /** スマホ時の基準フォントサイズ。タブレット時は内部で 1.5 倍される */
  baseFontSize: number;
  /** Platform.select の戻り値をそのまま渡せるよう undefined を許容 (Web 等は非タブレット扱い) */
  isTablet: boolean | undefined;
  /** 任意の追加スケール (TrainTypeBox の fontSizeScale prop 用)。既定 1 */
  fontSizeScale?: number;
  numberOfLines: 1 | 2;
  prevNumberOfLines: 1 | 2;
};

export type TwoLineTypographyResult = {
  fontSize: number;
  lineHeight: number | undefined;
  prevFontSize: number;
  prevLineHeight: number | undefined;
};

const resolve = (effectiveBase: number, lines: 1 | 2) => {
  const fontSize =
    lines === 2 ? effectiveBase * TWO_LINE_FONT_SCALE : effectiveBase;
  const lineHeight =
    lines === 2 ? fontSize * TWO_LINE_LINE_HEIGHT_MULTIPLIER : undefined;
  return { fontSize, lineHeight };
};

export const computeTwoLineTypography = ({
  baseFontSize,
  isTablet,
  fontSizeScale = 1,
  numberOfLines,
  prevNumberOfLines,
}: TwoLineTypographyArgs): TwoLineTypographyResult => {
  const effectiveBase =
    baseFontSize * (isTablet ? TABLET_FONT_MULTIPLIER : 1) * fontSizeScale;

  const current = resolve(effectiveBase, numberOfLines);
  const prev = resolve(effectiveBase, prevNumberOfLines);

  return {
    fontSize: current.fontSize,
    lineHeight: current.lineHeight,
    prevFontSize: prev.fontSize,
    prevLineHeight: prev.lineHeight,
  };
};
