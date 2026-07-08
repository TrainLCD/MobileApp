import { useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useRef } from 'react';
import { store } from '~/store';
import { MOVING_RECENCY_MS } from '~/utils/etaFallback';
import {
  etaAnchorAtom,
  etaFallbackActiveAtom,
} from '../store/atoms/etaFallback';
import { lastMovingAtMsAtom } from '../store/atoms/location';
import {
  arrivedAtom,
  selectedBoundAtom,
  stationAtom,
} from '../store/atoms/station';
import { useInterval } from './useInterval';

// AT_STATION の observedAtMs 更新周期。arrived/station が変化しない間も
// ETAフォールバックの仮想時計を進ませるため、定期的に打刻し直す。
const AT_STATION_REFRESH_INTERVAL_MS = 5_000;

/**
 * GPSで最後に確定した駅イベント(到着中/発車)を etaAnchorAtom へ記録するフック。
 * ETAフォールバック(GPS精度劣化・喪失時にETAデータで接近/到着状態を推定する機能)の
 * 仮想時計の起点として使われるため、フォールバック活性中(ETA由来の推定状態を
 * 誤って観測してしまう間)は記録を止め、直近のGPS実測アンカーを保持し続ける。
 */
export const useEtaAnchor = (): void => {
  const arrived = useAtomValue(arrivedAtom);
  const station = useAtomValue(stationAtom);
  const selectedBound = useAtomValue(selectedBoundAtom);
  const etaFallbackActive = useAtomValue(etaFallbackActiveAtom);
  const setAnchor = useSetAtom(etaAnchorAtom);

  // 直前レンダー時点の arrived/station を保持し、true→false 遷移(=発車)の検出に使う。
  // StrictMode は初回マウント時にeffectを一度余分に再実行するが、このrefは
  // クリーンアップで巻き戻さず「実際に評価した値」を都度書き込むため、
  // 再実行時は prevArrived === arrived となり同じ遷移を二重記録しない。
  const prevArrivedRef = useRef(arrived);
  const prevStationRef = useRef(station);

  useEffect(() => {
    const prevArrived = prevArrivedRef.current;
    const prevStation = prevStationRef.current;

    if (etaFallbackActive || selectedBound == null) {
      // フォールバック活性中(ETA由来の状態を観測してしまう)・行き先未選択中は
      // 記録しない。行き先未選択中に記録すると、下の clear effect と競合して
      // 古いアンカーが復活し、次回選択時のETA推定起点が汚染される。
      // ただし遷移検出用のrefは更新し、ガード解除後に古い遷移を誤検出しないようにする。
      prevArrivedRef.current = arrived;
      prevStationRef.current = station;
      return;
    }

    if (arrived && station?.id != null) {
      setAnchor({
        stationId: station.id,
        kind: 'AT_STATION',
        observedAtMs: Date.now(),
      });
    } else if (prevArrived && !arrived && prevStation?.id != null) {
      // 到着中→非到着への遷移。ただし精度悪化(強制未到着)で静止のまま arrived が
      // false に倒れただけの場合は「発車」ではない。直近に実移動が観測された時だけ
      // DEPARTED として記録し、駅で待機中の偽発車→位置前進を防ぐ(motion gate)。
      const lastMovingAtMs = store.get(lastMovingAtMsAtom);
      const recentlyMoving =
        lastMovingAtMs != null &&
        Date.now() - lastMovingAtMs < MOVING_RECENCY_MS;
      if (recentlyMoving) {
        setAnchor({
          stationId: prevStation.id,
          kind: 'DEPARTED',
          observedAtMs: Date.now(),
        });
      }
    }

    prevArrivedRef.current = arrived;
    prevStationRef.current = station;
  }, [arrived, station, selectedBound, etaFallbackActive, setAnchor]);

  // arrived/station が変化しない間も経過時間だけは進むため、数秒おきに
  // observedAtMsを更新し続ける(仮想時計の基準時刻を最新に保つ)
  useInterval(() => {
    if (
      selectedBound != null &&
      !etaFallbackActive &&
      arrived &&
      station?.id != null
    ) {
      setAnchor({
        stationId: station.id,
        kind: 'AT_STATION',
        observedAtMs: Date.now(),
      });
    }
  }, AT_STATION_REFRESH_INTERVAL_MS);

  useEffect(() => {
    if (selectedBound == null) {
      setAnchor(null);
    }
  }, [selectedBound, setAnchor]);
};
