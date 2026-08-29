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
  /**
   * 種別箱の内寸高さ。指定すると 2 行分の行送りが必ずこの高さへ収まるよう
   * fontSize / lineHeight を縮める。
   *
   * adjustsFontSizeToFit は fontSize だけを縮め、明示指定した lineHeight は
   * 縮めない。そのため `lineHeight * 2` が箱の高さを超えていると、
   * どれだけ字を小さくしても高さ制約を満たせず、グリフが潰れて種別名が
   * 消えたように見える (例: fontSizeScale 1.2 の小田急テーマ + 改行入り種別)。
   * ここで上限クランプしておくことで、その状態自体を発生させない。
   */
  maxHeight?: number;
};

export type TwoLineTypographyResult = {
  fontSize: number;
  lineHeight: number | undefined;
  prevFontSize: number;
  prevLineHeight: number | undefined;
};

const resolve = (
  effectiveBase: number,
  lines: 1 | 2,
  maxHeight: number | undefined
) => {
  if (lines === 1) {
    return { fontSize: effectiveBase, lineHeight: undefined };
  }

  const fontSize = effectiveBase * TWO_LINE_FONT_SCALE;
  const lineHeight = fontSize * TWO_LINE_LINE_HEIGHT_MULTIPLIER;

  if (
    maxHeight !== undefined &&
    maxHeight > 0 &&
    lineHeight * lines > maxHeight
  ) {
    const clampedLineHeight = maxHeight / lines;
    return {
      fontSize: clampedLineHeight / TWO_LINE_LINE_HEIGHT_MULTIPLIER,
      lineHeight: clampedLineHeight,
    };
  }

  return { fontSize, lineHeight };
};

export const computeTwoLineTypography = ({
  baseFontSize,
  isTablet,
  fontSizeScale = 1,
  numberOfLines,
  prevNumberOfLines,
  maxHeight,
}: TwoLineTypographyArgs): TwoLineTypographyResult => {
  const effectiveBase =
    baseFontSize * (isTablet ? TABLET_FONT_MULTIPLIER : 1) * fontSizeScale;

  const current = resolve(effectiveBase, numberOfLines, maxHeight);
  const prev = resolve(effectiveBase, prevNumberOfLines, maxHeight);

  return {
    fontSize: current.fontSize,
    lineHeight: current.lineHeight,
    prevFontSize: prev.fontSize,
    prevLineHeight: prev.lineHeight,
  };
};
