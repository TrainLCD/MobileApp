import { useSyncExternalStore } from 'react';
import { isTTSFeatureEnabled, subscribeRemoteConfig } from '~/lib/remoteConfig';

// TTS機能キルスイッチ(tts_enabled_ios / tts_enabled_android)のリアクティブ版。
// setupRemoteConfig は起動時に
// 非同期で完了するため、同期読みだけではコールドスタート時にフォールバック(true)で
// 描画された後、false 到着時の再レンダーが保証されない。キャッシュ更新を購読して
// 確実に再評価させる。
export const useTTSFeatureEnabled = (): boolean =>
  useSyncExternalStore(subscribeRemoteConfig, isTTSFeatureEnabled);
