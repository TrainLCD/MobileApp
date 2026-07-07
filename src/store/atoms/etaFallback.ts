import { atom } from 'jotai';
import type { EtaAnchor, EtaPhase } from '~/utils/etaFallback';

// GPSで最後に確定した駅イベント(ETAフォールバックの仮想時計の起点)
export const etaAnchorAtom = atom<EtaAnchor | null>(null);
// ETAフォールバック(R2: ETA単独駆動)が活性中か
export const etaFallbackActiveAtom = atom(false);
// ETA仮想時計から推定した最新の走行フェーズ。R2駆動と、精度劣化時の
// 到着しきい値緩和(R1: useRefreshStation が非リアクティブに参照)の双方で使う。
export const etaPhaseAtom = atom<EtaPhase | null>(null);
