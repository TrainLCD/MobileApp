import { PixelRatio, Platform } from 'react-native';

/**
 * ナンバリングアイコンで使う同梱フォントの縦メトリクス
 * (unitsPerEm に対する比率)。
 *
 * `ascent` / `descent` は hhea、`capHeight` は OS/2 の sCapHeight
 * (Verdana は OS/2 v1 で sCapHeight を持たないため `H` のアウトラインの yMax)。
 */
const FONT_METRICS = {
  // android/app/src/main/assets/fonts/FrutigerNeueLTPro-Bold.ttf
  FrutigerNeueLTProBold: { ascent: 1.13, descent: 0.264, capHeight: 0.698 },
  // android/app/src/main/assets/fonts/FuturaLTPro-Bold.ttf
  FuturaLTPro: { ascent: 0.825, descent: 0.175, capHeight: 0.754 },
  // android/app/src/main/assets/fonts/myriadpro-bold.ttf
  MyriadPro: { ascent: 0.75, descent: 0.25, capHeight: 0.674 },
  // android/app/src/main/assets/fonts/verdana-bold.ttf
  VerdanaBold: { ascent: 1.005, descent: 0.21, capHeight: 0.727 },
} as const;

export type NumberingGlyphFont = keyof typeof FONT_METRICS;

/** ナンバリングの1行分 */
export type NumberingGlyphLine = {
  fontSize: number;
  /**
   * 省略時は `fontSize` と同値。`longStationNumberAdditional` のように
   * `fontSize` だけを上書きするスタイルでは、実際に効く `lineHeight` を明示する。
   */
  lineHeight?: number;
  font: NumberingGlyphFont;
};

/**
 * 行ボックスの上端からベースラインまでの距離。
 *
 * RN Android の CustomLineHeightSpan は lineHeight とフォントの ascent+descent の差
 * (leading) を上下へ等分するため、ベースラインは行ボックスの中心から
 * fontSize × (ascent - descent) / 2 だけ下に来る。
 *
 * 端末やOSではなくフォントに依存する値である点に注意: フォントは APK 同梱で
 * `Typography` も allowFontScaling={false} のため、端末やフォントサイズ設定では
 * 変わらない。React Native 0.86.2 の CustomLineHeightSpan を前提にしているので、
 * RN のメジャーアップグレード時は実機で見た目を確認すること。
 */
const baselineOffset = ({
  fontSize,
  lineHeight = fontSize,
  font,
}: NumberingGlyphLine) => {
  const { ascent, descent } = FONT_METRICS[font];
  return lineHeight / 2 + (fontSize * (ascent - descent)) / 2;
};

/** 行ボックスの上端から、大文字・数字の上端(= ベースライン - capHeight)までの距離 */
const inkTopOffset = (line: NumberingGlyphLine) =>
  baselineOffset(line) - line.fontSize * FONT_METRICS[line.font].capHeight;

/**
 * 行ボックスの下端から ink の下端までの距離。
 * ナンバリングの記号と番号は大文字と数字だけでディセンダを持たないので、
 * ink の下端はベースラインそのものになる。
 */
const inkBottomOffset = (line: NumberingGlyphLine) =>
  (line.lineHeight ?? line.fontSize) - baselineOffset(line);

/**
 * translateY はレイアウトに影響しないぶん端数がそのまま描画位置になるので、
 * 文字がぼやけないよう物理ピクセル境界に丸める。
 */
const toTransform = (lift: number) =>
  Platform.OS === 'android'
    ? [{ translateY: PixelRatio.roundToNearestPixel(-lift) }]
    : [];

/**
 * 1行だけのテキストで、グリフを行ボックスの上下中央に揃える transform を返す
 * (iOS は lineHeight が font.lineHeight より小さいと RN が補正を当てないため、
 * この補正は Android のみ)。
 *
 * marginTop の負値では兄弟要素ごと動いてアイコン全体が縮むため、レイアウトに
 * 影響しない transform で文字だけを動かす。
 *
 * ズレの向きはフォント依存で、FrutigerNeueLTPro-Bold は下寄り、
 * myriadpro-bold と FuturaLTPro-Bold は上寄りと符号まで変わる。
 */
export const numberingGlyphLift = (
  fontSize: number,
  font: NumberingGlyphFont
) => {
  const line = { fontSize, font };
  return toTransform((inkTopOffset(line) - inkBottomOffset(line)) / 2);
};

/**
 * 記号と番号が縦に並ぶアイコンで、2行の ink 全体をアイコンの上下中央へ揃える
 * transform を返す。
 *
 * 記号と番号で異なる値を当てると両者の間隔まで変わってしまうので、戻り値は
 * 必ず両方の Text で同じものを使い回すこと。行ごとに最適な量が違っても、
 * 揃えたいのは ink 全体の位置なので 1 つの値で足りる。
 *
 * 上下の余白は「上の行の ink 上端までの余白」と「下の行の ink 下端からの余白」で
 * 決まり、その差の半分が中心のズレになる。記号側の marginTop はレイアウト箱ごと
 * 下げてしまうため、Android では当てないこと(iOS 側の視覚補正として残す)。
 */
export const numberingStackedGlyphLift = (
  symbol: NumberingGlyphLine,
  stationNumber: NumberingGlyphLine
) => toTransform((inkTopOffset(symbol) - inkBottomOffset(stationNumber)) / 2);
