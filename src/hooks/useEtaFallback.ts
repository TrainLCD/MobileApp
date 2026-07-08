import { useRef } from 'react';
import {
  getEtaFallbackArrivalConfirmMarginSec,
  isEtaAssistEnabled,
} from '~/lib/remoteConfig';
import { store } from '~/store';
import { etaAnchorAtom, etaPhaseAtom } from '~/store/atoms/etaFallback';
import { type EtaFallbackStop, estimateEtaPhase } from '~/utils/etaFallback';
import { useEstimateArrivalTimesRoute } from './useEstimateArrivalTimesRoute';
import { useInterval } from './useInterval';

// フェーズ再評価の周期(ms)。ETA仮想時計は1秒粒度で進める。
const TICK_INTERVAL_MS = 1_000;
// ETAデータの分解能で発車分−到着分が0になる駅の停車時間の底上げ(分)。
const MIN_DWELL_MIN = 0.5;

/**
 * route.stops(絶対累積分・全stops)から、停車駅かつ累積分が揃っているものだけを
 * 進行方向順のまま estimateEtaPhase 用の配列へ変換する。
 */
const extractStops = (
  route: ReturnType<typeof useEstimateArrivalTimesRoute>['route']
): EtaFallbackStop[] => {
  const stops = route?.stops;
  if (!stops) {
    return [];
  }
  const result: EtaFallbackStop[] = [];
  for (const s of stops) {
    if (
      s.stopsHere !== true ||
      s.stationId == null ||
      s.cumulativeMinutes == null ||
      s.departureCumulativeMinutes == null
    ) {
      continue;
    }
    result.push({
      stationId: s.stationId,
      cumulativeMinutes: s.cumulativeMinutes,
      departureCumulativeMinutes: s.departureCumulativeMinutes,
    });
  }
  return result;
};

/**
 * ETA(サーバー計算の到着予測)とGPSで最後に確定した駅イベント(アンカー)からの経過時間で、
 * 現在の走行フェーズ(走行中/接近中/停車中)を推定して etaPhaseAtom へ公開するフック。
 *
 * 位置・到着・接近の状態は**駆動しない**(GPS = useRefreshStation を唯一の権威に保つ)。
 * かつて ETA が状態を独占駆動する R2 フォールバックを備えていたが、GPSが凍結する地下では
 * ETA時刻がそのまま位置を進め、駅に到着後も現在地が勝手に動く重大なデグレを招いたため撤去した。
 * 現在の ETA の役割は「GPSの補助」に限定する:
 * - etaPhaseAtom を公開し、useRefreshStation が精度劣化時に「ETAが同じ駅で停車を示すときだけ
 *   その駅の到着しきい値を緩和する(R1)」ために使う。到着判定自体は常にGPSが行う。
 */
export const useEtaFallback = (): void => {
  // 機能が無効な間はETAルートのGraphQL取得自体を止める(LineBoard表示側が
  // 取得しないテーマでも、無効時に不要なフェッチを走らせない)。
  const { route } = useEstimateArrivalTimesRoute({
    skip: !isEtaAssistEnabled(),
  });
  const routeRef = useRef(route);
  routeRef.current = route;

  const tick = (): void => {
    const now = Date.now();
    const enabled = isEtaAssistEnabled();

    const stops = extractStops(routeRef.current);
    const anchor = store.get(etaAnchorAtom);
    const marginMin = getEtaFallbackArrivalConfirmMarginSec() / 60;
    const phase =
      enabled && stops.length > 0 && anchor
        ? estimateEtaPhase(stops, anchor, now, {
            arrivalConfirmMarginMin: marginMin,
            minDwellMin: MIN_DWELL_MIN,
          })
        : null;
    // R1(到着しきい値緩和)のために推定フェーズを公開する。状態の駆動は行わない。
    store.set(etaPhaseAtom, phase);
  };

  useInterval(tick, TICK_INTERVAL_MS);
};
