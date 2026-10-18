import { createContext, useContext } from 'react';

// Permitted が所有する設定モーダルを開く。別のモーダル状態は作らない。
export const RunningSettingsContext = createContext<(() => void) | null>(null);
export const useRunningSettings = () => useContext(RunningSettingsContext);
