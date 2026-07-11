import { atom } from 'jotai';
import type { EtaAnchor, EtaFallbackStop } from '~/utils/etaFallback';

// GPSで最後に確定した駅イベント(ETA推定フェーズの仮想時計の起点)
export const etaAnchorAtom = atom<EtaAnchor | null>(null);
// ETA推定フェーズの入力となる停車駅リスト(useEtaFallbackがルート変更時に更新)。
// フェーズ自体はatomで常駐更新せず、必要な瞬間にgetEtaPhaseNowで計算する。
export const etaStopsAtom = atom<EtaFallbackStop[]>([]);
