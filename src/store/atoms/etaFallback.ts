import { atom } from 'jotai';
import type { EtaAnchor } from '~/utils/etaFallback';

// GPSで最後に確定した駅イベント(ETAフォールバックの仮想時計の起点)
export const etaAnchorAtom = atom<EtaAnchor | null>(null);
// ETAフォールバック(R2: ETA単独駆動)が活性中か
export const etaFallbackActiveAtom = atom(false);
