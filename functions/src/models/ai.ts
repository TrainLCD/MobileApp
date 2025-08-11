export type AIReport = {
  title: string;
  summary: string;
  is_spam: boolean;
  labels: string[];
  confidence: number;
  reason: string;
};

export type FewShotItem = {
  input: string;
  output: string;
  disabled?: boolean;
  weight?: number;
};
