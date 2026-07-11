import { useEffect } from 'react';
import { isEtaAssistEnabled } from '~/lib/remoteConfig';
import { store } from '~/store';
import { etaStopsAtom } from '~/store/atoms/etaFallback';
import type { EtaFallbackStop } from '~/utils/etaFallback';
import { useEstimateArrivalTimesRoute } from './useEstimateArrivalTimesRoute';

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
 * ETA(サーバー計算の到着予測)ルートを取得し、推定フェーズの入力となる停車駅リストを
 * etaStopsAtom へ公開するフック。
 *
 * 位置・到着・接近の状態は**駆動しない**(GPS = useRefreshStation を唯一の権威に保つ)。
 * かつて ETA が状態を独占駆動する R2 フォールバックを備えていたが、GPSが凍結する地下では
 * ETA時刻がそのまま位置を進め、駅に到着後も現在地が勝手に動く重大なデグレを招いたため撤去した。
 * 現在の ETA の役割は「GPSの補助」に限定する:
 * - useRefreshStation が精度劣化時に getEtaPhaseNow で仮想時計フェーズをオンデマンド計算し、
 *   「ETAが同じ駅で停車を示すときだけその駅の到着しきい値を緩和する(R1)」ために使う。
 *   到着判定自体は常にGPSが行う。
 * - 以前は本フックが1秒間隔の常駐タイマーでフェーズを計算しatomへ公開していたが、
 *   参照頻度の低い値のために毎秒JSスレッドを起こすのは電池・発熱面で無駄なため、
 *   タイマーを廃してオンデマンド計算(utils/etaPhaseNow.ts)へ移行した。
 */
export const useEtaFallback = (): void => {
  // 機能が無効な間はETAルートのGraphQL取得自体を止める(LineBoard表示側が
  // 取得しないテーマでも、無効時に不要なフェッチを走らせない)。
  const { route } = useEstimateArrivalTimesRoute({
    skip: !isEtaAssistEnabled(),
  });

  useEffect(() => {
    store.set(etaStopsAtom, extractStops(route));
    return () => {
      store.set(etaStopsAtom, []);
    };
  }, [route]);
};
