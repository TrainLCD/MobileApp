import { useSyncExternalStore } from 'react';
import { isRemoteTTSEnabled, subscribeRemoteConfig } from '~/lib/remoteConfig';
import { subscribeRemoteTTSOverride } from '~/lib/remoteTTSOverride';

// isRemoteTTSEnabled は Remote Config の配信値と試験的機能の上書き設定の両方を見るため、
// どちらの変化でも再評価されるよう2つのストアをまとめて購読する。
// useSyncExternalStore は subscribe の参照が変わるたびに購読し直すので、モジュール
// スコープで安定した関数を持つ。
const subscribe = (listener: () => void): (() => void) => {
  const unsubscribeRemoteConfig = subscribeRemoteConfig(listener);
  const unsubscribeOverride = subscribeRemoteTTSOverride(listener);
  return () => {
    unsubscribeRemoteConfig();
    unsubscribeOverride();
  };
};

// リモート合成の有効判定(remote_tts_enabled_ios / remote_tts_enabled_android)の
// リアクティブ版。useTTSFeatureEnabled と同じく、setupRemoteConfig は起動時に
// 非同期で完了するため、同期読みだけではコールドスタート時にフォールバック値で
// 描画された後の再レンダーが保証されない。キャッシュ更新を購読して再評価させる。
export const useRemoteTTSEnabled = (): boolean =>
  useSyncExternalStore(subscribe, isRemoteTTSEnabled);
