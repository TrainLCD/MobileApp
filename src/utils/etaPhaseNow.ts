import {
  getEtaFallbackArrivalConfirmMarginSec,
  isEtaAssistEnabled,
} from '~/lib/remoteConfig';
import { store } from '~/store';
import { etaAnchorAtom, etaStopsAtom } from '~/store/atoms/etaFallback';
import { type EtaPhase, estimateEtaPhase } from './etaFallback';

// ETAデータの分解能で発車分−到着分が0になる駅の停車時間の底上げ(分)。
const MIN_DWELL_MIN = 0.5;

/**
 * ETA仮想時計の現在フェーズをオンデマンドで計算する。
 *
 * かつては1秒間隔の常駐タイマー(useEtaFallback)が毎秒計算してatomへ公開していたが、
 * 結果を使うのは「精度劣化時のGPS到着判定補助(R1)」とDevOverlayの診断表示だけで、
 * どちらも参照頻度が低い。毎秒JSスレッドを起こす電池コストを避けるため、
 * 必要になった瞬間に純関数で求める方式に変更した。評価時点のnowMsで計算するので、
 * タイマー方式(最大1秒古い値)より鮮度はむしろ高く、推定結果は同一である。
 */
export const getEtaPhaseNow = (nowMs: number = Date.now()): EtaPhase | null => {
  if (!isEtaAssistEnabled()) {
    return null;
  }
  const anchor = store.get(etaAnchorAtom);
  const stops = store.get(etaStopsAtom);
  if (!anchor || stops.length === 0) {
    return null;
  }
  return estimateEtaPhase(stops, anchor, nowMs, {
    arrivalConfirmMarginMin: getEtaFallbackArrivalConfirmMarginSec() / 60,
    minDwellMin: MIN_DWELL_MIN,
  });
};
