import { useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useRef } from 'react';
import { etaAnchorAtom } from '../store/atoms/etaFallback';
import { locationAccuracyOutlierAtom } from '../store/atoms/location';
import {
  arrivedAtom,
  selectedBoundAtom,
  stationAtom,
} from '../store/atoms/station';
import { locationAccuracyAtom } from '../store/selectors/location';
import getIsPass from '../utils/isPass';
import { isLocationUntrustworthy } from '../utils/locationTrust';
import { useInterval } from './useInterval';

// AT_STATION の observedAtMs 更新周期。arrived/station が変化しない間も
// ETAフォールバックの仮想時計を進ませるため、定期的に打刻し直す。
const AT_STATION_REFRESH_INTERVAL_MS = 5_000;

/**
 * GPSで最後に確定した駅イベント(到着中/発車)を etaAnchorAtom へ記録するフック。
 * このアンカーは ETA 推定フェーズ(getEtaPhaseNow)の仮想時計の起点として使われ、
 * 精度劣化時の到着しきい値緩和(R1)の対象駅判定に用いられる。
 *
 * 通過駅(getIsPass)は記録対象外とする。ETAのstops(useEtaFallback)は
 * stopsHere === true の停車駅のみを持つため、通過駅IDでアンカーを記録しても
 * estimateEtaPhase側でi0が見つからずnullになるだけで、無駄にアンカーを
 * 上書きして直前の有効な停車駅アンカーを消してしまう。
 */
export const useEtaAnchor = (): void => {
  const arrived = useAtomValue(arrivedAtom);
  const station = useAtomValue(stationAtom);
  const selectedBound = useAtomValue(selectedBoundAtom);
  const setAnchor = useSetAtom(etaAnchorAtom);
  // 発車の真偽を確かめるために測位の信頼性を見る。座標そのものではなく
  // 精度と外れ値フラグだけを購読するので、測位のたびに再評価はされない。
  const isAccuracyOutlier = useAtomValue(locationAccuracyOutlierAtom);
  const accuracy = useAtomValue(locationAccuracyAtom);

  // 直前レンダー時点の arrived/station を保持し、true→false 遷移(=発車)の検出に使う。
  // StrictMode は初回マウント時にeffectを一度余分に再実行するが、このrefは
  // クリーンアップで巻き戻さず「実際に評価した値」を都度書き込むため、
  // 再実行時は prevArrived === arrived となり同じ遷移を二重記録しない。
  const prevArrivedRef = useRef(arrived);
  const prevStationRef = useRef(station);

  useEffect(() => {
    const prevArrived = prevArrivedRef.current;
    const prevStation = prevStationRef.current;

    if (selectedBound == null) {
      // 行き先未選択中は記録しない。記録すると、下の clear effect と競合して
      // 古いアンカーが復活し、次回選択時のETA推定起点が汚染される。
      // ただし遷移検出用のrefは更新し、ガード解除後に古い遷移を誤検出しないようにする。
      prevArrivedRef.current = arrived;
      prevStationRef.current = station;
      return;
    }

    if (arrived && station?.id != null && !getIsPass(station)) {
      setAnchor({
        stationId: station.id,
        kind: 'AT_STATION',
        observedAtMs: Date.now(),
      });
    } else if (
      prevArrived &&
      !arrived &&
      prevStation?.id != null &&
      !getIsPass(prevStation)
    ) {
      // 到着中→非到着への遷移(=発車)を検出した瞬間にだけ一発記録する。
      //
      // ただし、この遷移は「発車した」以外の理由でも起きる。地下鉄の駅で精度が落ちると
      // useRefreshStationが現在位置を信用できないと判断してarrivedをfalseへ倒すため、
      // 停車したままでも発車として記録されてしまう(#6936の調査で確認)。そこから
      // ETA仮想時計が走り出すと、以降の推定は「もう発車したはず」の側へずれる。
      // 測位が信用できない間の遷移は発車の証拠にならないので記録しない。
      // この場合アンカーは直前のAT_STATIONのまま据え置かれ、精度が回復して次の到着を
      // 検出した時点で正しく張り直される。
      if (isLocationUntrustworthy({ isAccuracyOutlier, accuracy })) {
        prevArrivedRef.current = arrived;
        prevStationRef.current = station;
        return;
      }

      setAnchor({
        stationId: prevStation.id,
        kind: 'DEPARTED',
        observedAtMs: Date.now(),
      });
    }

    prevArrivedRef.current = arrived;
    prevStationRef.current = station;
  }, [arrived, station, selectedBound, setAnchor, isAccuracyOutlier, accuracy]);

  // arrived/station が変化しない間も経過時間だけは進むため、数秒おきに
  // observedAtMsを更新し続ける(仮想時計の基準時刻を最新に保つ)
  useInterval(() => {
    if (
      selectedBound != null &&
      arrived &&
      station?.id != null &&
      !getIsPass(station)
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
