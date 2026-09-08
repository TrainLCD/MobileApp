import { useCallback, useSyncExternalStore } from 'react';
import { subscribeRemoteConfig } from '~/lib/remoteConfig';
import {
  getVoicevoxAssetsStatus,
  subscribeVoicevoxAssets,
  type VoicevoxAssetsStatus,
} from '~/lib/voicevox/assets';

/**
 * VOICEVOX 資産 (辞書・音声モデル) の取得状態のリアクティブ版。設定画面の
 * 進捗表示に使う。取得の進行 (subscribeVoicevoxAssets) と、有効化・配信 URL を
 * 決める Remote Config の到着 (subscribeRemoteConfig) の両方で再評価する。
 */
export const useVoicevoxAssetsStatus = (): VoicevoxAssetsStatus => {
  const subscribe = useCallback((listener: () => void) => {
    const unsubscribeAssets = subscribeVoicevoxAssets(listener);
    const unsubscribeRemoteConfig = subscribeRemoteConfig(listener);
    return () => {
      unsubscribeAssets();
      unsubscribeRemoteConfig();
    };
  }, []);
  return useSyncExternalStore(subscribe, getVoicevoxAssetsStatus);
};
