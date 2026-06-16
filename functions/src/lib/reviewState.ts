/** レビュー通知ジョブの既読状態を KV で保持する（旧 GCS state の代替）。 */
export type ReviewState = {
  lastUpdated?: string | null;
  lastIds?: string[];
};

export const loadReviewState = async (
  kv: KVNamespace,
  key: string
): Promise<ReviewState> => {
  try {
    const json = await kv.get<ReviewState>(key, 'json');
    return json ?? {};
  } catch {
    return {};
  }
};

export const saveReviewState = async (
  kv: KVNamespace,
  key: string,
  state: ReviewState
): Promise<void> => {
  await kv.put(key, JSON.stringify(state));
};
