import { useSyncExternalStore } from 'react';
import { isRemoteTTSEnabled, subscribeRemoteConfig } from '~/lib/remoteConfig';

// リモート合成の有効判定(remote_tts_enabled_ios / remote_tts_enabled_android)の
// リアクティブ版。useTTSFeatureEnabled と同じく、setupRemoteConfig は起動時に
// 非同期で完了するため、同期読みだけではコールドスタート時にフォールバック値で
// 描画された後の再レンダーが保証されない。キャッシュ更新を購読して再評価させる。
export const useRemoteTTSEnabled = (): boolean =>
  useSyncExternalStore(subscribeRemoteConfig, isRemoteTTSEnabled);
