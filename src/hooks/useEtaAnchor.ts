import { useAtomValue, useSetAtom, useStore } from 'jotai';
import { useCallback, useEffect, useRef } from 'react';
import { etaAnchorAtom } from '../store/atoms/etaFallback';
import { locationAtom } from '../store/atoms/location';
import {
  arrivedAtom,
  selectedBoundAtom,
  stationAtom,
} from '../store/atoms/station';
import getIsPass from '../utils/isPass';
import { useInterval } from './useInterval';

// AT_STATION の observedAtMs 打ち直し周期。arrived/station が変化しない間も
// 到着を確認し続ける測位は届くため、その時刻までは基準を追随させる。
const AT_STATION_REFRESH_INTERVAL_MS = 5_000;

/**
 * GPSで最後に確定した駅イベント(到着中/発車)を etaAnchorAtom へ記録するフック。
 * このアンカーは ETA 推定フェーズ(getEtaPhaseNow)の仮想時計の起点として使われ、
 * ETAが許す進行量を超えた測位の棄却(#6939)で、進行量を測る基準駅として用いられる。
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
  const store = useStore();

  // 観測時刻は「最後に受理した測位の時刻」を使う。棄却判定(isImplausibleByEta)は
  // getEtaPhaseNow(location.timestamp)で測位の時刻軸のまま仮想時計を回すため、基準側を
  // Date.now()で打つと端末時計とGPS時刻のずれぶん仮想時計が前後し、ずれが遅れ側に出た
  // 区間では棄却が増える。locationAtomは毎秒更新されるので購読はせず、必要な瞬間に読む。
  //
  // 受理済み測位が無い間はアンカーを記録しない。このフックが記録するのは「GPSで確定した
  // 駅イベント」であり、測位が無ければ確定していない。useRefreshStationは測位が無いとき
  // arrivedをtrueに倒すので、ここでDate.now()へフォールバックすると端末時計軸のアンカーが
  // でき、初回測位が届いても下の単調ガード(端末時計 >= GPS時刻)で打ち直されないまま
  // 軸のずれが固定される。棄却判定はGPS軸なので、そのずれぶん仮想時計が遅れて
  // DWELLINGに張り付き、Aで直したはずの凍結が最初の駅だけで再発しうる。
  const getObservedAtMs = useCallback(
    (): number | null => store.get(locationAtom)?.timestamp ?? null,
    [store]
  );

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

    const observedAtMs = getObservedAtMs();

    if (
      observedAtMs != null &&
      arrived &&
      station?.id != null &&
      !getIsPass(station)
    ) {
      setAnchor({
        stationId: station.id,
        kind: 'AT_STATION',
        observedAtMs,
      });
    } else if (
      observedAtMs != null &&
      prevArrived &&
      !arrived &&
      prevStation?.id != null &&
      !getIsPass(prevStation)
    ) {
      // 到着中→非到着への遷移(=発車)を検出した瞬間にだけ一発記録する。ETAは位置を
      // 駆動せず測位の棄却にしか使わないため、仮に静止中の強制未到着で記録されても、
      // 棄却は上限時間(ETA_BOUND_MAX_HOLD_MS)で必ず打ち切られ、GPS復帰で自己修復する。
      setAnchor({
        stationId: prevStation.id,
        kind: 'DEPARTED',
        observedAtMs,
      });
    }

    prevArrivedRef.current = arrived;
    prevStationRef.current = station;
  }, [arrived, station, selectedBound, setAnchor, getObservedAtMs]);

  // arrived/station が変化しない間も、到着を確認し続けている測位が届くあいだは
  // observedAtMsを打ち直す(遅延で停車が伸びてもETAが先へ行かないようにする)。
  //
  // ただし打ち直しは「最後に受理した測位の時刻」までに限る。無条件にDate.now()で
  // 打ち直すと、ETAの進行量上限(#6939)が測位を棄却して位置が凍結したときに、arrivedが
  // 到着駅でtrueに張り付いたまま基準時刻も一緒に進むため仮想時計が一切進まない。
  // その間フェーズはDWELLINGに固定され、許容は停車駅1つぶんのまま広がらないので、
  // 棄却がETA_BOUND_MAX_HOLD_MSに達するまで続く(地下鉄で発車を観測できないまま
  // 許容外の測位が届いた場合にこの経路へ入る)。受理済み測位の時刻で止めておけば、
  // 測位が受理されなくなった瞬間から仮想時計が動き出し、ETA側が自力で追いつける。
  useInterval(() => {
    if (
      selectedBound == null ||
      !arrived ||
      station?.id == null ||
      getIsPass(station)
    ) {
      return;
    }
    const observedAtMs = getObservedAtMs();
    if (observedAtMs == null) {
      return;
    }
    const current = store.get(etaAnchorAtom);
    const isSameAnchor =
      current?.kind === 'AT_STATION' && current.stationId === station.id;
    if (isSameAnchor && current.observedAtMs >= observedAtMs) {
      return;
    }
    setAnchor({
      stationId: station.id,
      kind: 'AT_STATION',
      observedAtMs,
    });
  }, AT_STATION_REFRESH_INTERVAL_MS);

  useEffect(() => {
    if (selectedBound == null) {
      setAnchor(null);
    }
  }, [selectedBound, setAnchor]);
};
