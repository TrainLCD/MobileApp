import getDistance from 'geolib/es/getDistance';
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
  lastAcceptedFixAccuracyAtom,
  lastAcceptedFixAtMsAtom,
  lastMovingAtMsAtom,
  locationAccuracyOutlierAtom,
  locationAtom,
} from '~/store/atoms/location';
import navigationState, { autoModeEnabledAtom } from '~/store/atoms/navigation';
import stationState, {
  selectedBoundAtom,
  stationsAtom,
} from '~/store/atoms/station';
import {
  type EtaAnchor,
  type EtaFallbackStop,
  estimateEtaPhase,
  isRecentlyMoving,
} from '~/utils/etaFallback';
import { useEstimateArrivalTimesRoute } from './useEstimateArrivalTimesRoute';
import { useInterval } from './useInterval';

// 発動・解除判定の周期(ms)。ETA仮想時計は1秒粒度で進める。
const TICK_INTERVAL_MS = 1_000;
// 受理測位がこの時間以上途絶したら「無信号」とみなす(ms)。
const FIX_STALENESS_MS = 30_000;
// GPS劣化(外れ値/精度>200m)がこの時間「持続」して初めてGPS不良とみなす(ms)。
// 一瞬の劣化(地上の高架下・ビル街等)では発動させないための持続喪失ゲート。
const GPS_LOST_SUSTAIN_MS = 20_000;
// ETAデータの分解能で発車分−到着分が0になる駅の停車時間の底上げ(分)。
const MIN_DWELL_MIN = 0.5;
// 出発確認の変位下限(m)。AT_STATIONアンカーから発動した場合、現在位置がアンカー駅から
// この距離(精度が粗いときはmax(これ, 精度))を超えて離れるまで前進させず現在駅ホールド。
// 駅で待機中に位置が勝手に進む誤動作を防ぐ(motion gate の中核)。
const DEPARTURE_MIN_M = 300;

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

  // GPS劣化(外れ値/精度>200m)が始まった時刻(持続判定用)。良好時は null に戻す。
  const degradedSinceRef = useRef<number | null>(null);
  // フォールバックを発動した時刻(タイムキャップ用)。
  const activatedAtRef = useRef<number | null>(null);
  // 直近で座標スナップ済みの駅ID(到着ごとに1回だけスナップする)。
  const snappedStationIdRef = useRef<number | null>(null);
  // アンカー駅からの出発が確認済みか(前進ゲート)。発動毎にリセットし、確認されるまでは
  // 現在駅でホールドして前進させない。
  const departureConfirmedRef = useRef(false);

  const deactivate = (): void => {
    if (store.get(etaFallbackActiveAtom)) {
      store.set(etaFallbackActiveAtom, false);
    }
    activatedAtRef.current = null;
    snappedStationIdRef.current = null;
    departureConfirmedRef.current = false;
  };

  // 出発未確認の間、現在駅(アンカー駅)でホールドする。drive の DWELLING と違い、
  // 座標スナップはしない(実GPS位置を残し、出発の変位検知を継続できるようにする)。
  // 駅が見つからなければ false(呼び出し側で解除)。
  const holdAtStation = (stationId: number): boolean => {
    const station = store.get(stationsAtom).find((s) => s.id === stationId);
    if (!station) {
      return false;
    }
    store.set(navigationState, (prev) =>
      prev.stationForHeader?.id !== station.id
        ? { ...prev, stationForHeader: station }
        : prev
    );
    store.set(stationState, (prev) =>
      prev.arrived === true &&
      prev.approaching === false &&
      prev.station?.id === station.id
        ? prev
        : { ...prev, arrived: true, approaching: false, station }
    );
    return true;
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

  // 前進ゲート: アンカー駅からの出発が確認できるまで現在駅ホールドし、確認後に drive する。
  // DEPARTED アンカーは motion gate 済み=実発車の確証なので即確認。AT_STATION は現在位置が
  // アンカー駅から max(DEPARTURE_MIN_M, 実測位精度) を超えて離れたら確認。GPS凍結時は変位
  // 0のままホールドされ続け、駅で待機中に位置が勝手に進むのを防ぐ。
  const driveGated = (
    phase: NonNullable<ReturnType<typeof estimateEtaPhase>>,
    anchor: EtaAnchor,
    nowMs: number,
    lastFixAccuracy: number | null
  ): boolean => {
    if (!departureConfirmedRef.current) {
      if (anchor.kind === 'DEPARTED') {
        departureConfirmedRef.current = true;
      } else {
        const anchorStation = store
          .get(stationsAtom)
          .find((s) => s.id === anchor.stationId);
        const loc = store.get(locationAtom);
        if (
          anchorStation?.latitude != null &&
          anchorStation?.longitude != null &&
          loc?.coords != null
        ) {
          const dist = getDistance(
            { latitude: loc.coords.latitude, longitude: loc.coords.longitude },
            {
              latitude: anchorStation.latitude,
              longitude: anchorStation.longitude,
            }
          );
          if (dist > Math.max(DEPARTURE_MIN_M, lastFixAccuracy ?? 0)) {
            departureConfirmedRef.current = true;
          }
        }
      }
    }
    if (!departureConfirmedRef.current) {
      // 未出発: 現在駅ホールド(前進しない・座標スナップしない)。
      return holdAtStation(anchor.stationId);
    }
    return drive(phase, nowMs);
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
    const outlier = store.get(locationAccuracyOutlierAtom);
    const lastFixMs = store.get(lastAcceptedFixAtMsAtom);
    // 精度判定は locationAtom ではなく「最後に受理された実測位」の精度で見る。
    // 到着スナップが locationAtom を accuracy:0 で直書きするため、locationAtom を見ると
    // (1) goodFix が偽陽性になり早期解除する、(2) accuracyBad が毎tickリセットされ
    // 精度劣化の継続を追えなくなる。両者を snapshot 非依存の実測位精度で判定する。
    const lastFixAccuracy = store.get(lastAcceptedFixAccuracyAtom);

    // 瞬間的な劣化シグナル(外れ値棄却 or 実測位精度>200m)。一瞬の劣化では発動させない。
    const degraded =
      outlier ||
      (lastFixAccuracy != null && lastFixAccuracy > BAD_ACCURACY_THRESHOLD);
    if (degraded) {
      if (degradedSinceRef.current == null) {
        degradedSinceRef.current = now;
      }
    } else {
      degradedSinceRef.current = null;
    }
    // 劣化が約20秒「持続」して初めてGPS不良とみなす。これにより地上鉄道の一瞬のGPS飛び
    // (高架下・ビル街等)では発動せず、地下鉄トンネルや地上の長いトンネルのように
    // 持続的に喪失した区間だけを対象にする(路線種別で絞らずに本来の意図へ収束させる)。
    const sustainedDegraded =
      degradedSinceRef.current != null &&
      now - degradedSinceRef.current >= GPS_LOST_SUSTAIN_MS;
    // 受理測位が途絶している(スナップの直書きでは lastFixMs は更新されない)。
    const stale = lastFixMs != null && now - lastFixMs > FIX_STALENESS_MS;
    const gpsLost = stale || sustainedDegraded;

    // 良好測位の受理。中途半端な測位(200〜1500m)では解除しない(ヒステリシス)。
    const goodFix =
      !outlier &&
      lastFixAccuracy != null &&
      lastFixAccuracy <= BAD_ACCURACY_THRESHOLD &&
      lastFixMs != null &&
      now - lastFixMs <= FIX_STALENESS_MS;

    // 直近に実移動(電車が動いていた)を観測したか。駅で静止したまま(待機・遅延停車)は
    // 発動させないための発動ゲート。前進ゲート(driveGated)と併せて誤前進を防ぐ。
    const recentlyMoving = isRecentlyMoving(store.get(lastMovingAtMsAtom), now);

    if (active) {
      const maxDurationMs = getEtaFallbackMaxDurationMin() * 60_000;
      const capExceeded =
        activatedAtRef.current != null &&
        now - activatedAtRef.current > maxDurationMs;
      if (
        bound == null ||
        autoMode ||
        goodFix ||
        capExceeded ||
        !phase ||
        !anchor
      ) {
        deactivate();
        return;
      }
      // 駆動不能(DWELLING駅がstationsAtom上に無い)なら解除して凍結を防ぐ。
      if (!driveGated(phase, anchor, now, lastFixAccuracy)) {
        deactivate();
      }
      return;
    }

    if (
      bound != null &&
      !autoMode &&
      gpsLost &&
      recentlyMoving &&
      phase &&
      anchor
    ) {
      store.set(etaFallbackActiveAtom, true);
      activatedAtRef.current = now;
      snappedStationIdRef.current = null;
      departureConfirmedRef.current = false;
      if (!driveGated(phase, anchor, now, lastFixAccuracy)) {
        deactivate();
      }
    }
  };

  useInterval(tick, TICK_INTERVAL_MS);
};
