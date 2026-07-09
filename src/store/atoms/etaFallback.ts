import { atom } from 'jotai';
import type { EtaAnchor, EtaPhase } from '~/utils/etaFallback';

// GPSで最後に確定した駅イベント(ETA推定フェーズの仮想時計の起点)
export const etaAnchorAtom = atom<EtaAnchor | null>(null);
// ETA仮想時計から推定した最新の走行フェーズ。精度劣化時の到着しきい値緩和
// (R1: useRefreshStation が非リアクティブに参照)に使う。
export const etaPhaseAtom = atom<EtaPhase | null>(null);
