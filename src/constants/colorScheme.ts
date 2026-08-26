import { COLOR_SCHEME, type ColorScheme } from '../models/ColorScheme';

/**
 * 操作系画面で使う配色トークン。
 *
 * LIGHT の値は各画面にハードコードされていた既存の色をそのまま引き写しているため、
 * ライトモードでは従来と完全に同じ見た目になる。DARK だけが新規の配色。
 * 同系色でも従来値が異なるもの(白 #FFFFFF と #FCFCFC など)はトークンを分けている。
 * この対応関係は colorScheme.test.ts で固定しているので、統合する場合は
 * 従来の見た目が変わらないことを確認すること。
 * LEDテーマは路線テーマ側で独自の黒背景を持つので、ここでは扱わない。
 */
export type AppColors = {
  /** 画面全体の背景 */
  background: string;
  /** リスト項目やカードの背景 */
  card: string;
  /** 背景からわずかに浮かせる面(入力欄・プリセットカード・プライバシー画面) */
  subtleSurface: string;
  /** 画面いっぱいの素の背景(エラー画面など) */
  plainBackground: string;
  /** カードの内側に展開されるアコーディオンの背景 */
  cardExpanded: string;
  /** 路線色カードなど、背景から浮かせるための縁取り */
  cardBorder: string;
  /** 区切り線・枠線 */
  border: string;
  /** バッジの背景 */
  badgeBackground: string;
  /** プレビュー画像を載せる面 */
  previewBackground: string;
  /** 本文の文字色 */
  text: string;
  /** モーダル見出しの文字色(本文より濃い) */
  modalHeadingText: string;
  /** 補足文の文字色 */
  secondaryText: string;
  /** さらに弱い補足文(ライセンス本文など)の文字色 */
  mutedText: string;
  /** リンクやボタンのアクセントカラー */
  accent: string;
  /** アウトラインボタン・OFF状態のパネルなど、背景の上に置く面の色 */
  surface: string;
  /** OFF状態のパネルの枠線 */
  panelOffBorder: string;
  /** OFF状態のパネルの文字色 */
  panelOffText: string;
  /** Androidの半透明ヘッダー背景(iOSはBlurViewを使う) */
  headerBackground: string;
  /** BlurViewのtint */
  blurTint: 'light' | 'dark';
  /** フッタータブバーの非アクティブアイコン */
  tabIconInactive: string;
  /** ローディングスケルトンの背景 */
  skeletonBackground: string;
  /** ローディングスケルトンのハイライト */
  skeletonHighlight: string;
  /** ダークモードかどうか(色以外の分岐が必要な箇所向け) */
  isDark: boolean;
};

export const LIGHT_APP_COLORS: AppColors = {
  background: '#FAFAFA',
  card: '#FFFFFF',
  subtleSurface: '#FCFCFC',
  plainBackground: '#FFFFFF',
  cardExpanded: '#F5F5F5',
  cardBorder: '#FFFFFF',
  border: '#DDDDDD',
  badgeBackground: '#F0F0F0',
  previewBackground: '#E0E0E0',
  text: '#333333',
  modalHeadingText: '#111111',
  secondaryText: '#8B8B8B',
  mutedText: '#666666',
  accent: '#008FFE',
  surface: '#FFFFFF',
  panelOffBorder: '#AAAAAA',
  panelOffText: '#888888',
  headerBackground: 'rgba(250,250,250,0.9)',
  blurTint: 'light',
  tabIconInactive: '#6B7280',
  skeletonBackground: '#E1E9EE',
  skeletonHighlight: '#F2F8FC',
  isDark: false,
};

export const DARK_APP_COLORS: AppColors = {
  background: '#121316',
  card: '#1C1E22',
  subtleSurface: '#1C1E22',
  plainBackground: '#121316',
  cardExpanded: '#24272C',
  cardBorder: '#2E3238',
  border: '#2E3238',
  badgeBackground: '#24272C',
  previewBackground: '#24272C',
  text: '#ECEDEF',
  modalHeadingText: '#ECEDEF',
  secondaryText: '#9AA0A6',
  mutedText: '#B4B9BF',
  accent: '#0A84FF',
  surface: '#1C1E22',
  panelOffBorder: '#5A6068',
  panelOffText: '#C2C7CD',
  headerBackground: 'rgba(18,19,22,0.9)',
  blurTint: 'dark',
  tabIconInactive: '#9BA1A8',
  skeletonBackground: '#2A2D33',
  skeletonHighlight: '#3A3E45',
  isDark: true,
};

export const APP_COLORS: Record<ColorScheme, AppColors> = {
  [COLOR_SCHEME.LIGHT]: LIGHT_APP_COLORS,
  [COLOR_SCHEME.DARK]: DARK_APP_COLORS,
};
