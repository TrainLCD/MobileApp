import { Platform } from 'react-native';

/**
 * FrutigerNeueLTPro-Bold の縦メトリクス(unitsPerEm=1000 に対する比率)。
 * android/app/src/main/assets/fonts/FrutigerNeueLTPro-Bold.ttf の hhea / OS/2 の値。
 */
const FONT_ASCENT = 1.13;
const FONT_DESCENT = 0.264;
const FONT_CAP_HEIGHT = 0.698;

/**
 * Android でナンバリングのグリフが行ボックス内で下寄りになる分の比率。
 *
 * RN Android の CustomLineHeightSpan は lineHeight とフォントの ascent+descent の差
 * (leading) を上下へ等分するため、行ボックスの中心はフォントの ascent/descent ボックスの
 * 中心に一致する。ナンバリングの記号と番号は大文字と数字だけでディセンダを持たないので、
 * ベースラインより下の descent がそのまま余白として残り、グリフが下寄りに見える。
 * ズレ量は (ascent - descent) - capHeight で、その半分を引き上げると上下が揃う。
 * 式から lineHeight が消えることからも分かるとおり、補正量は文字サイズに比例する。
 *
 * 端末やOSではなくフォントに依存する値である点に注意:
 * フォントは APK 同梱で `Typography` も allowFontScaling={false} のため、端末や
 * フォントサイズ設定では変わらない。一方 myriadpro-bold は -0.087em、FuturaLTPro-Bold は
 * -0.052em と符号が逆になるので、別フォントのアイコンにそのまま流用してはいけない。
 * React Native 0.86.2 の CustomLineHeightSpan を前提にしているので、RN のメジャー
 * アップグレード時は実機で見た目を確認すること。
 */
const GLYPH_LIFT_RATIO = (FONT_ASCENT - FONT_DESCENT - FONT_CAP_HEIGHT) / 2;

/**
 * Android のグリフ下寄り分を打ち消す transform を返す(iOS は行ボックス内で中央に
 * 描かれるため補正しない)。
 *
 * marginTop の負値では兄弟要素ごと動いてアイコン全体が縮むため、レイアウトに影響しない
 * transform で文字だけを持ち上げる。
 *
 * 記号と番号で異なる値を渡すと両者の間隔まで変わってしまうので、1つのアイコンでは
 * 必ず同じ戻り値を使い回すこと。
 *
 * @param baseLineHeight 基準にする行の高さ(本リポジトリでは lineHeight === fontSize)
 */
export const numberingGlyphLift = (baseLineHeight: number) =>
  Platform.OS === 'android'
    ? [{ translateY: -Math.round(baseLineHeight * GLYPH_LIFT_RATIO) }]
    : [];
