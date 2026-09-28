import { randomUUID } from 'expo-crypto';
import { useAtomValue } from 'jotai';
import { useEffect, useRef } from 'react';
import type { Station } from '~/@types/graphql';
import {
  appendRideStop,
  enqueueRideLogMutation,
  insertRideSession,
  type RideSessionRecord,
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

type RideSessionMeta = Omit<RideSessionRecord, 'id' | 'startedAt' | 'endedAt'>;

type SessionState = {
  // Main 画面を開いた時刻。出発駅の発車を検出できなかったときの開始時刻に使う
  mountedAt: number;
  // オートモードを一度でも有効にしたら、この画面を抜けるまで記録しない
  tainted: boolean;
  lastStation: Station | null;
  stops: RideStopRecord[];
  // 乗車が確定した時点の路線・種別・方面。確定するまでは null
  meta: RideSessionMeta | null;
  // DB に書けたセッションの ID と、そのうち書けた駅の数
  persistedId: string | null;
  persistedCount: number;
  // 書いた後に発車時刻が変わった駅(seq -> 発車時刻)
  pendingDepartures: Map<number, number>;
};

// 書き込みは全件削除と同じ列に並べる(src/lib/rideLog.ts の enqueueRideLogMutation)
const enqueueWrite = (task: () => Promise<void>) => {
  enqueueRideLogMutation(task).catch((err) => {
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

// 書いた駅の発車時刻が、書いた内容に含まれていれば書き足す必要はない
const clearWrittenDepartures = (
  session: SessionState,
  written: RideStopRecord[]
) => {
  for (const stop of written) {
    if (
      stop.departedAt != null &&
      session.pendingDepartures.get(stop.seq) === stop.departedAt
    ) {
      session.pendingDepartures.delete(stop.seq);
    }
  }
};

/**
 * メモリ上の乗車を DB に反映する。書き込みキューから1本ずつ呼ばれる。
 *
 * 書く内容はキューに積んだ時点ではなく、実行する時点のメモリから決める。
 * 先行する書き込みが失敗しても、その間に検出した駅を取りこぼさずに次の実行で
 * まとめて書き直せるようにするため。失敗したときは状態を進めずに抜ける。
 */
const syncRideLog = async (session: SessionState): Promise<void> => {
  const { meta } = session;
  if (!meta) {
    return;
  }

  if (!session.persistedId) {
    const stops = session.stops;
    const lastArrival = [...stops]
      .reverse()
      .find((s) => s.kind === 'arrived' && s.arrivedAt != null);
    // 失敗したセッションの ID は使い回さず、書き直しのたびに振り直す
    const id = randomUUID();
    await insertRideSession(
      {
        id,
        startedAt: stops[0]?.departedAt ?? session.mountedAt,
        endedAt: lastArrival?.arrivedAt ?? session.mountedAt,
        ...meta,
      },
      stops
    );
    session.persistedId = id;
    session.persistedCount = stops.length;
    clearWrittenDepartures(session, stops);
  }

  const id = session.persistedId;
  while (session.persistedCount < session.stops.length) {
    const stop = session.stops[session.persistedCount];
    await appendRideStop(id, stop);
    session.persistedCount += 1;
    clearWrittenDepartures(session, [stop]);
  }

  for (const [seq, departedAt] of [...session.pendingDepartures]) {
    if (seq >= session.persistedCount) {
      continue;
    }
    await updateRideStopDeparture(id, seq, departedAt);
    if (session.pendingDepartures.get(seq) === departedAt) {
      session.pendingDepartures.delete(seq);
    }
  }
};

/**
 * 振り返り機能(#5751)の乗車ログを記録する。Main 画面を開いてから抜けるまでを
 * 1回の乗車として扱い、到着・通過を検出した駅を順に書く。
 *
 * 画面を開いただけ・ホームで待っているだけのセッションを数えないよう、出発駅の
 * 次の駅への到着を1回検出するまでは DB に書かずメモリに溜める。確定後は検出の
 * たびに書くので、アプリが終了されても最後の到着までは残る。書き込みに失敗した
 * ときは、次の検出・発車・画面を抜けたときに、溜めた駅ごと書き直す。
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
    mountedAt: Date.now(),
    tainted: false,
    lastStation: null,
    stops: [],
    meta: null,
    persistedId: null,
    persistedCount: 0,
    pendingDepartures: new Map(),
  });
  const prevArrivedRef = useRef(arrived);

  useEffect(() => {
    if (autoModeEnabled) {
      sessionRef.current.tainted = true;
    }
  }, [autoModeEnabled]);

  // Main 画面を抜けるときに、書き残しがあれば書き直す。最後の到着で書き込みに
  // 失敗した場合は、これが最後の機会になる
  useEffect(() => {
    const session = sessionRef.current;
    return () => {
      enqueueWrite(() => syncRideLog(session));
    };
  }, []);

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
      Date.now(),
      distance
    );
    if (!stop) {
      return;
    }
    session.lastStation = station;
    session.stops = [...session.stops, stop];

    // 通過だけでは乗車を確定しない。確定したら溜めていた通過駅もまとめて書く
    if (!session.meta) {
      if (kind !== 'arrived') {
        return;
      }
      session.meta = {
        lineId: currentLine?.id ?? null,
        lineName: currentLine?.nameShort ?? null,
        lineColor: currentLine?.color ?? null,
        trainTypeId: trainType?.id ?? null,
        direction: selectedDirection,
      };
    }
    enqueueWrite(() => syncRideLog(session));
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
    if (!session.meta) {
      return;
    }
    session.pendingDepartures.set(last.seq, departedAt);
    enqueueWrite(() => syncRideLog(session));
  }, [arrived, autoModeEnabled]);
};
