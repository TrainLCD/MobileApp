import { useRef } from 'react';
import { BAD_ACCURACY_THRESHOLD } from '~/constants';
import {
  getEtaFallbackArrivalConfirmMarginSec,
  getEtaFallbackMaxDurationMin,
  isEtaAssistEnabled,
} from '~/lib/remoteConfig';
import { store } from '~/store';
import {
  etaAnchorAtom,
  etaFallbackActiveAtom,
  etaPhaseAtom,
} from '~/store/atoms/etaFallback';
import {
  lastAcceptedFixAtMsAtom,
  locationAccuracyOutlierAtom,
  locationAtom,
} from '~/store/atoms/location';
import navigationState, { autoModeEnabledAtom } from '~/store/atoms/navigation';
import stationState, {
  selectedBoundAtom,
  stationsAtom,
} from '~/store/atoms/station';
import { type EtaFallbackStop, estimateEtaPhase } from '~/utils/etaFallback';
import { useEstimateArrivalTimesRoute } from './useEstimateArrivalTimesRoute';
import { useInterval } from './useInterval';

// 発動・解除判定の周期(ms)。ETA仮想時計は1秒粒度で進める。
const TICK_INTERVAL_MS = 1_000;
// 受理測位がこの時間以上途絶したら「無信号」とみなす(ms)。
const FIX_STALENESS_MS = 30_000;
// 精度劣化(>200m)がこの時間継続したらGPS不良とみなす(ms)。
const ACCURACY_SUSTAIN_MS = 20_000;
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
 * GPS精度が劣化・喪失した区間(地下鉄など)で、サーバー計算のETAとGPSで最後に
 * 確定した駅イベント(アンカー)からの経過時間で走行状態を推定し、接近/到着状態を
 * 前進駆動するフォールバック(R2)。
 *
 * - 発動: リモート設定有効・ナビ中・autoMode無効・GPS不良(外れ値/受理測位の途絶/
 *   精度劣化の継続)・アンカーが有効ルート上にある、をすべて満たすとき。
 * - 解除: 良好測位の受理(≤200m)/ナビ終了/タイムキャップ超過/推定不能。解除後は
 *   GPS優先へ戻り、useRefreshStation が権威を回復する。
 * - 活性中は毎tick estimateEtaPhase を評価し、RUNNING/APPROACHING/DWELLING に応じて
 *   arrived/approaching/現在駅を駆動。到着(DWELLING)へ移った駅では駅座標を
 *   locationAtom へ1回スナップして下流(最寄り駅・距離表示)と整合させる。
 * - 推定フェーズは etaPhaseAtom に常時公開し、精度劣化時の到着しきい値緩和(R1)に使う。
 */
export const useEtaFallback = (): void => {
  // 機能が無効な間はETAルートのGraphQL取得自体を止める(LineBoard表示側が
  // 取得しないテーマでも、無効時に不要なフェッチを走らせない)。
  const { route } = useEstimateArrivalTimesRoute({
    skip: !isEtaAssistEnabled(),
  });
  const routeRef = useRef(route);
  routeRef.current = route;

  // 精度劣化が始まった時刻(継続判定用)。良好時は null に戻す。
  const badSinceRef = useRef<number | null>(null);
  // フォールバックを発動した時刻(タイムキャップ用)。
  const activatedAtRef = useRef<number | null>(null);
  // 直近で座標スナップ済みの駅ID(到着ごとに1回だけスナップする)。
  const snappedStationIdRef = useRef<number | null>(null);

  const deactivate = (): void => {
    if (store.get(etaFallbackActiveAtom)) {
      store.set(etaFallbackActiveAtom, false);
    }
    activatedAtRef.current = null;
    snappedStationIdRef.current = null;
  };

  const snapshotLocation = (
    latitude: number,
    longitude: number,
    nowMs: number
  ): void => {
    // setLocation() を通さず直接スナップする。lastFilteredLocation・外れ値フラグ・
    // 受理測位時刻(staleness判定)を汚染しないため(useSimulationMode と同じ流儀)。
    store.set(locationAtom, {
      timestamp: nowMs,
      coords: {
        latitude,
        longitude,
        accuracy: 0,
        altitude: null,
        altitudeAccuracy: null,
        speed: null,
        heading: null,
      },
    });
  };

  // 駆動できたら true、DWELLING駅がstationsAtom上に見つからず駆動不能なら false。
  // false のとき呼び出し側はフォールバックを解除し、状態更新の凍結を防ぐ。
  const drive = (
    phase: NonNullable<ReturnType<typeof estimateEtaPhase>>,
    nowMs: number
  ): boolean => {
    if (phase.kind === 'DWELLING') {
      const station = store
        .get(stationsAtom)
        .find((s) => s.id === phase.stationId);
      if (!station) {
        return false;
      }
      // 到着した駅が変わった瞬間にのみ座標スナップとヘッダー駅更新を行う。
      if (snappedStationIdRef.current !== station.id) {
        if (station.latitude != null && station.longitude != null) {
          snapshotLocation(station.latitude, station.longitude, nowMs);
        }
        store.set(navigationState, (prev) =>
          prev.stationForHeader?.id !== station.id
            ? { ...prev, stationForHeader: station }
            : prev
        );
        snappedStationIdRef.current = phase.stationId;
      }
      store.set(stationState, (prev) =>
        prev.arrived === true &&
        prev.approaching === false &&
        prev.station?.id === station.id
          ? prev
          : { ...prev, arrived: true, approaching: false, station }
      );
      return true;
    }

    // RUNNING / APPROACHING: 現在駅(=直前の停車駅)は据え置き、フラグのみ駆動する。
    const approaching = phase.kind === 'APPROACHING';
    // 次の停車駅へ走り出したら、次に到着する駅で再びスナップできるよう解除する。
    snappedStationIdRef.current = null;
    store.set(stationState, (prev) =>
      prev.arrived === false && prev.approaching === approaching
        ? prev
        : { ...prev, arrived: false, approaching }
    );
    return true;
  };

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
    // R1(到着しきい値緩和)のために推定フェーズを常時公開する。
    store.set(etaPhaseAtom, phase);

    const active = store.get(etaFallbackActiveAtom);

    if (!enabled) {
      if (active) {
        deactivate();
      }
      return;
    }

    const bound = store.get(selectedBoundAtom);
    const autoMode = store.get(autoModeEnabledAtom);
    const location = store.get(locationAtom);
    const accuracy = location?.coords.accuracy ?? null;
    const outlier = store.get(locationAccuracyOutlierAtom);
    const lastFixMs = store.get(lastAcceptedFixAtMsAtom);

    // 精度劣化の継続時間を追跡する。
    const accuracyBad = accuracy != null && accuracy > BAD_ACCURACY_THRESHOLD;
    if (accuracyBad) {
      if (badSinceRef.current == null) {
        badSinceRef.current = now;
      }
    } else {
      badSinceRef.current = null;
    }
    const accuracySustainedBad =
      badSinceRef.current != null &&
      now - badSinceRef.current >= ACCURACY_SUSTAIN_MS;
    // 受理測位が途絶している(スナップの直書きでは lastFixMs は更新されない)。
    const stale = lastFixMs != null && now - lastFixMs > FIX_STALENESS_MS;
    const gpsLost = outlier || stale || accuracySustainedBad;

    // 良好測位の受理。中途半端な測位(200〜1500m)では解除しない(ヒステリシス)。
    const goodFix =
      !outlier &&
      accuracy != null &&
      accuracy <= BAD_ACCURACY_THRESHOLD &&
      lastFixMs != null &&
      now - lastFixMs <= FIX_STALENESS_MS;

    if (active) {
      const maxDurationMs = getEtaFallbackMaxDurationMin() * 60_000;
      const capExceeded =
        activatedAtRef.current != null &&
        now - activatedAtRef.current > maxDurationMs;
      if (bound == null || autoMode || goodFix || capExceeded || !phase) {
        deactivate();
        return;
      }
      // 駆動不能(DWELLING駅がstationsAtom上に無い)なら解除して凍結を防ぐ。
      if (!drive(phase, now)) {
        deactivate();
      }
      return;
    }

    if (bound != null && !autoMode && gpsLost && phase) {
      store.set(etaFallbackActiveAtom, true);
      activatedAtRef.current = now;
      snappedStationIdRef.current = null;
      if (!drive(phase, now)) {
        deactivate();
      }
    }
  };

  useInterval(tick, TICK_INTERVAL_MS);
};
