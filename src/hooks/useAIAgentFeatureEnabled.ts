import { useSyncExternalStore } from 'react';
import {
  isAIAgentFeatureEnabled,
  subscribeRemoteConfig,
} from '~/lib/remoteConfig';

// AIエージェント機能キルスイッチ(ai_agent_enabled)のリアクティブ版。
// setupRemoteConfig は起動時に非同期で完了するため、同期読みだけではコールドスタート時の
// キャッシュ更新に追従できない。useTTSFeatureEnabled と同じくキャッシュ更新を購読する。
export const useAIAgentFeatureEnabled = (): boolean =>
  useSyncExternalStore(subscribeRemoteConfig, isAIAgentFeatureEnabled);
