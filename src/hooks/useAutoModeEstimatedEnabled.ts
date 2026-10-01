import { useSyncExternalStore } from 'react';
import {
  isAutoModeEstimatedEnabled,
  subscribeRemoteConfig,
} from '~/lib/remoteConfig';

// オートモードの走らせ方(auto_mode_estimated_enabled)のリアクティブ版。
// setupRemoteConfig は起動時に非同期で完了するため、同期読みだけではコールドスタート時の
// キャッシュ更新に追従できない。useAIAgentFeatureEnabled と同じくキャッシュ更新を購読する。
export const useAutoModeEstimatedEnabled = (): boolean =>
  useSyncExternalStore(subscribeRemoteConfig, isAutoModeEstimatedEnabled);
