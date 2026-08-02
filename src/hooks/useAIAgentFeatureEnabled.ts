import { useSyncExternalStore } from 'react';
import {
  isAIAgentFeatureEnabled,
  subscribeRemoteConfig,
} from '~/lib/remoteConfig';
import { isDevApp } from '~/utils/isDevApp';

// AIエージェント機能キルスイッチ(ai_agent_enabled)のリアクティブ版。
// setupRemoteConfig は起動時に非同期で完了するため、同期読みだけではコールドスタート時の
// キャッシュ更新に追従できない。useTTSFeatureEnabled と同じくキャッシュ更新を購読する。
// PoC 期間中は本番ビルドへ一切露出させないため isDevApp との AND でゲートする
// (Phase 2 で本番開放する際にこの条件を外す)。
export const useAIAgentFeatureEnabled = (): boolean => {
  const remoteEnabled = useSyncExternalStore(
    subscribeRemoteConfig,
    isAIAgentFeatureEnabled
  );
  return isDevApp && remoteEnabled;
};
