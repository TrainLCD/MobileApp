import { randomUUID } from 'expo-crypto';
import { useAtomValue } from 'jotai';
import { type MutableRefObject, useEffect, useRef } from 'react';
import type { Station } from '~/@types/graphql';
import {
  appendRideStop,
  insertRideSession,
  type RideStopKind,
  type RideStopRecord,
  updateRideStopDeparture,
} from '~/lib/rideLog';
import { autoModeEnabledAtom } from '~/store/atoms/navigation';
import {
  arrivedAtom,
  selectedDirectionAtom,
  stationAtom,
  stationsAtom,
} from '~/store/atoms/station';
import getIsPass from '~/utils/isPass';
import { getRideDistanceMeters } from '~/utils/rideDistance';
import { useCurrentLine } from './useCurrentLine';
import { useCurrentTrainType } from './useCurrentTrainType';
import { useLoopLine } from './useLoopLine';

type SessionState = {
  // DB に書いたセッションの ID。乗車が確定するまでは null
  id: string | null;
  // Main 画面を開いた時刻。出発駅の発車を検出できなかったときの開始時刻に使う
  mountedAt: number;
  // オートモードを一度でも有効にしたら、この画面を抜けるまで記録しない
  tainted: boolean;
  lastStation: Station | null;
  stops: RideStopRecord[];
};

const enqueueWrite = (
  queueRef: MutableRefObject<Promise<void>>,
  task: () => Promise<void>
) => {
  queueRef.current = queueRef.current.then(task).catch((err) => {
    console.error('useRideRecorder: 乗車ログの書き込みに失敗しました', err);
  });
};

const toStopRecord = (
  station: Station,
  seq: number,
  kind: RideStopKind,
  arrivedAt: number | null,
  distanceFromPrevious: number
): RideStopRecord | null => {
  if (station.id == null) {
    return null;
  }
  return {
    seq,
    stationId: station.id,
    stationGroupId: station.groupId ?? null,
    stationName: station.name ?? null,
    lineId: station.line?.id ?? null,
    lineName: station.line?.nameShort ?? null,
    lineColor: station.line?.color ?? null,
    kind,
    arrivedAt,
    departedAt: null,
    distanceFromPrevious,
    distanceSource: 'haversine',
  };
};

/**
 * 振り返り機能(#5751)の乗車ログを記録する。Main 画面を開いてから抜けるまでを
 * 1回の乗車として扱い、到着・通過を検出した駅を順に書く。
 *
 * 画面を開いただけ・ホームで待っているだけのセッションを数えないよう、出発駅の
 * 次の駅への到着を1回検出するまでは DB に書かずメモリに溜める。確定後は検出の
 * たびに書くので、アプリが終了されても最後の到着までは残る。
 *
 * 駅の検出は useRefreshStation が stationAtom を更新したことで知る。通過駅も
 * 到着圏に入ると stationAtom に入るので、停車条件で到着と通過を分ける。
 * オートモードの駅移動は実際の乗車ではないため記録しない。
 */
export const useRideRecorder = (): void => {
  const station = useAtomValue(stationAtom);
  const arrived = useAtomValue(arrivedAtom);
  const stations = useAtomValue(stationsAtom);
  const autoModeEnabled = useAtomValue(autoModeEnabledAtom);
  const selectedDirection = useAtomValue(selectedDirectionAtom);
  const currentLine = useCurrentLine();
  const trainType = useCurrentTrainType();
  const { isLoopLine } = useLoopLine();

  const sessionRef = useRef<SessionState>({
    id: null,
    mountedAt: Date.now(),
    tainted: false,
    lastStation: null,
    stops: [],
  });
  const prevArrivedRef = useRef(arrived);
  // DB への書き込みは検出した順に反映させる(セッションの INSERT より先に
  // 駅の INSERT が走らないようにする)
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (autoModeEnabled) {
      sessionRef.current.tainted = true;
    }
  }, [autoModeEnabled]);

  useEffect(() => {
    const session = sessionRef.current;
    if (session.tainted || autoModeEnabled || !station) {
      return;
    }
    // StrictMode の再実行や無関係な依存の変化では何もしない
    if (session.lastStation?.id === station.id) {
      return;
    }

    if (!session.lastStation) {
      const origin = toStopRecord(station, 0, 'arrived', null, 0);
      if (!origin) {
        return;
      }
      session.lastStation = station;
      session.stops = [origin];
      return;
    }

    const now = Date.now();
    const kind: RideStopKind = getIsPass(station) ? 'passed' : 'arrived';
    const distance = getRideDistanceMeters(
      stations,
      session.lastStation,
      station,
      isLoopLine
    );
    const stop = toStopRecord(
      station,
      session.stops.length,
      kind,
      now,
      distance
    );
    if (!stop) {
      return;
    }
    session.lastStation = station;
    session.stops = [...session.stops, stop];

    const sessionId = session.id;
    if (sessionId) {
      enqueueWrite(writeQueueRef, () => appendRideStop(sessionId, stop));
      return;
    }

    // 通過だけでは乗車を確定しない。確定したら溜めていた通過駅もまとめて書く
    if (kind !== 'arrived') {
      return;
    }
    const id = randomUUID();
    session.id = id;
    const stops = session.stops;
    const record = {
      id,
      startedAt: stops[0]?.departedAt ?? session.mountedAt,
      endedAt: now,
      lineId: currentLine?.id ?? null,
      lineName: currentLine?.nameShort ?? null,
      lineColor: currentLine?.color ?? null,
      trainTypeId: trainType?.id ?? null,
      direction: selectedDirection,
    };
    // 書き込みに失敗したら未確定に戻す。ID を残したままだと、以降の追記が外部キー
    // 違反で失敗し続け、この乗車が1件も残らない。未確定に戻せば、次の到着で
    // メモリに溜めた駅をまとめて書き直す
    enqueueWrite(writeQueueRef, () =>
      insertRideSession(record, stops).catch((err) => {
        if (sessionRef.current.id === id) {
          sessionRef.current.id = null;
        }
        throw err;
      })
    );
  }, [
    autoModeEnabled,
    currentLine,
    isLoopLine,
    selectedDirection,
    station,
    stations,
    trainType,
  ]);

  useEffect(() => {
    const wasArrived = prevArrivedRef.current;
    prevArrivedRef.current = arrived;
    const session = sessionRef.current;
    if (!wasArrived || arrived || session.tainted || autoModeEnabled) {
      return;
    }
    const last = session.stops[session.stops.length - 1];
    if (!last || last.kind === 'passed') {
      return;
    }
    const departedAt = Date.now();
    session.stops = session.stops.map((s) =>
      s.seq === last.seq ? { ...s, departedAt } : s
    );
    const sessionId = session.id;
    if (sessionId) {
      enqueueWrite(writeQueueRef, () =>
        updateRideStopDeparture(sessionId, last.seq, departedAt)
      );
    }
  }, [arrived, autoModeEnabled]);
};
