/**
 * AI相談画面だけで使う淡色。共通パレットへ足すほど汎用ではないため局所的に持つ。
 * ライトは導入前の値をそのまま維持し、ダークの値だけ新規に定義する。
 * (LEDテーマ用の色は各コンポーネントの `isLEDTheme` 分岐にそのまま残している)
 */
export const AGENT_COLORS = {
  light: {
    /** 免責文・入力中ラベルの文字色 */
    mutedText: '#737373',
  },
  dark: {
    mutedText: '#9AA0A6',
  },
} as const;

export const getAgentColors = (isDark: boolean) =>
  isDark ? AGENT_COLORS.dark : AGENT_COLORS.light;
