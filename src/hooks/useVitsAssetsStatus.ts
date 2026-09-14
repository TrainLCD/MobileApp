import { useCallback, useSyncExternalStore } from 'react';
import { subscribeRemoteConfig } from '~/lib/remoteConfig';
import {
  getVitsAssetsStatus,
  subscribeVitsAssets,
  type VitsAssetsStatus,
} from '~/lib/vits/assets';

/**
 * VITS 資産 (英語音声モデル・発音辞書) の取得状態のリアクティブ版。設定画面の
 * 進捗表示に使う。取得の進行 (subscribeVitsAssets) と、有効化・配信 URL を
 * 決める Remote Config の到着 (subscribeRemoteConfig) の両方で再評価する。
 */
export const useVitsAssetsStatus = (): VitsAssetsStatus => {
  const subscribe = useCallback((listener: () => void) => {
    const unsubscribeAssets = subscribeVitsAssets(listener);
    const unsubscribeRemoteConfig = subscribeRemoteConfig(listener);
    return () => {
      unsubscribeAssets();
      unsubscribeRemoteConfig();
    };
  }, []);
  return useSyncExternalStore(subscribe, getVitsAssetsStatus);
};
