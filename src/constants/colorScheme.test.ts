import { DARK_APP_COLORS, LIGHT_APP_COLORS } from './colorScheme';

/**
 * ライトのパレットは、ダークモード導入前に各画面へ直接書かれていた色と
 * 同じ値でなければならない(導入前後でライトの見た目が変わらないことの担保)。
 * 値の出どころをコメントに残しているので、トークンを統合・改名するときは
 * ここが落ちないことを必ず確認すること。
 */
describe('LIGHT_APP_COLORS', () => {
  it.each([
    ['background', '#FAFAFA'], // 各設定画面の screenBg
    ['card', '#FFFFFF'], // 設定項目・モーダルの背景 ('white' / '#fff')
    ['subtleSurface', '#FCFCFC'], // SearchBar / AgentInputBar / PresetCard / Privacy
    ['plainBackground', '#FFFFFF'], // ErrorScreen・ルートスタックの contentStyle
    ['cardExpanded', '#F5F5F5'], // CommonCard のアコーディオン
    ['cardBorder', '#FFFFFF'], // CommonCard / Button の縁取り
    ['border', '#DDDDDD'], // WalkthroughOverlay のドット・NowHeader のバッジ枠
    ['badgeBackground', '#F0F0F0'], // NowHeader のバスバッジ
    ['strongBorder', '#AAAAAA'], // 入力欄の枠・TrainTypeList の区切り線
    ['modalHeaderBackground', 'rgba(255,255,255,0.92)'], // モーダルのヘッダー/フッター
    ['previewBackground', '#E0E0E0'], // ThemeConfirmModal のプレビュー面
    ['text', '#333333'], // Typography の既定色
    ['modalHeadingText', '#111111'], // StationSearchModal の見出し
    ['secondaryText', '#8B8B8B'], // 各設定画面の説明文
    ['mutedText', '#666666'], // Licenses の補足・NoPresetsCard のアイコン
    ['accent', '#008FFE'], // Button / StatePanel / リンク
    ['surface', '#FFFFFF'], // アウトラインボタン・OFF状態のパネル
    ['panelOffBorder', '#AAAAAA'], // StatePanel の OFF 枠
    ['panelOffText', '#888888'], // StatePanel の OFF 文字
    ['headerBackground', 'rgba(250,250,250,0.9)'], // Android のヘッダー背景
    ['tabIconInactive', '#6B7280'], // FooterTabBar の非アクティブアイコン
    ['skeletonBackground', '#E1E9EE'], // SkeletonPlaceholder の既定値
    ['skeletonHighlight', '#F2F8FC'], // SkeletonPlaceholder の既定値
  ] as const)('%s は従来の %s を維持する', (token, expected) => {
    expect(LIGHT_APP_COLORS[token]).toBe(expected);
  });

  it('ライトとダークで同じトークンを持つ', () => {
    expect(Object.keys(DARK_APP_COLORS).sort()).toEqual(
      Object.keys(LIGHT_APP_COLORS).sort()
    );
    expect(LIGHT_APP_COLORS.isDark).toBe(false);
    expect(DARK_APP_COLORS.isDark).toBe(true);
  });
});
