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
    const json = (await kv.get(key, 'json')) as Partial<ReviewState> | null;
    if (!json || typeof json !== 'object') return {};
    return {
      lastUpdated:
        typeof json.lastUpdated === 'string' ? json.lastUpdated : null,
      lastIds: Array.isArray(json.lastIds)
        ? json.lastIds.filter((x): x is string => typeof x === 'string')
        : [],
    };
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
