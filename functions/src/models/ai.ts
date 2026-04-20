/**
 * AI生成レポートの型定義
 */
export const AI_CATEGORIES = [
  'bug',
  'feature_request',
  'improvement',
  'question',
] as const;
export type AICategory = (typeof AI_CATEGORIES)[number];

export const AI_TRIAGE_LEVELS = ['urgent', 'high', 'medium', 'low'] as const;
export type AITriageLevel = (typeof AI_TRIAGE_LEVELS)[number];

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
  /** 主分類カテゴリ */
  category: AICategory;
  /** トリアージ（優先度）レベル */
  triageLevel: AITriageLevel;
};

export type FewShotItem = {
  input: string;
  output: string;
  disabled?: boolean;
  weight?: number;
};
