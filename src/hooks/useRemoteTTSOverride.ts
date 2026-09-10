import { useSyncExternalStore } from 'react';
import {
  getRemoteTTSOverride,
  type RemoteTTSOverride,
  subscribeRemoteTTSOverride,
} from '~/lib/remoteTTSOverride';

/**
 * 試験的機能「リモートTTSの強制切替」の現在値のリアクティブ版。値はモジュール側の
 * キャッシュが単一の情報源なので、画面はローカル state を持たずこれを購読する。
 */
export const useRemoteTTSOverride = (): RemoteTTSOverride =>
  useSyncExternalStore(subscribeRemoteTTSOverride, getRemoteTTSOverride);
