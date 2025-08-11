/**
 * AI生成レポートの型定義
 */
export type AIReport = {
  /** レポートのタイトル */
  title: string;
  /** レポートの要約 */
  summary: string;
  /** スパム判定フラグ */
  isSpam: boolean;
  /** ラベルのリスト（例: 'bug', 'feature-request' など） */
  labels: string[];
  /** 信頼度スコア (0.0 - 1.0) */
  confidence: number;
  /** 分類理由 */
  reason: string;
};

export type FewShotItem = {
  input: string;
  output: string;
  disabled?: boolean;
  weight?: number;
};
