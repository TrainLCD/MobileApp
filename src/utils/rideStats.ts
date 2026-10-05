import type { RideSessionWithStops, RideStopRecord } from '~/lib/rideLog';

/**
 * 振り返り機能(#5751)の集計。乗車ログ(src/lib/rideLog.ts)を期間ごとにまとめる。
 * 日付の区切りはすべて端末のタイムゾーン(Date のローカル時刻)で行う。
 */

export type RidePeriod = 'week' | 'month' | 'year';

// [start, end) の半開区間
export type RidePeriodRange = { start: Date; end: Date };

// 駅を検出する間隔がこれを超えたら、その手前の駅で乗車が終わったとみなす。
// アプリを開いたまま放置した乗車で時間が膨らまないようにするため。トンネルなどで
// 検出が長く途切れる区間を誤って打ち切らないよう、余裕を持たせている
export const MAX_STOP_GAP_MS = 90 * 60 * 1000;

const startOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date: Date, days: number): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

/**
 * now を含む期間の範囲を返す。週は月曜日から日曜日までの7日間で、月や年を
 * またぐ週もそのまま7日で数える。
 */
export const getRidePeriodRange = (
  period: RidePeriod,
  now: Date
): RidePeriodRange => {
  switch (period) {
    case 'week': {
      // getDay は日曜が0。月曜を週の始まりにするため、月曜からの日数に直す
      const daysSinceMonday = (now.getDay() + 6) % 7;
      const start = addDays(startOfDay(now), -daysSinceMonday);
      return { start, end: addDays(start, 7) };
    }
    case 'month':
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      };
    case 'year':
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: new Date(now.getFullYear() + 1, 0, 1),
      };
  }
};

// 駅を検出した時刻。出発駅は到着を観測していないので発車時刻、それも無ければ乗車の開始時刻
const stopTime = (
  stop: RideStopRecord,
  session: RideSessionWithStops
): number => stop.arrivedAt ?? stop.departedAt ?? session.startedAt;

export type RideMeasurement = {
  distanceMeters: number;
  durationMs: number;
  // 集計に使った駅(出発駅から最後の到着まで)
  stops: RideStopRecord[];
};

/**
 * 1回の乗車の距離と時間を求める。
 *
 * 距離は、出発駅から最後に到着を検出した駅までの distanceFromPrevious の合計。
 * 最後の到着より後に通過だけを検出した駅は数えない。時間は乗りはじめた時刻から
 * 最後の到着まで。駅の検出が MAX_STOP_GAP_MS を超えて途切れたら、その手前で
 * 乗車が終わったとみなし、後ろの駅は距離にも時間にも入れない。
 */
export const measureRide = (session: RideSessionWithStops): RideMeasurement => {
  const ordered = [...session.stops].sort((a, b) => a.seq - b.seq);

  let cut = ordered.length;
  for (let i = 1; i < ordered.length; i++) {
    const prev = ordered[i - 1];
    const cur = ordered[i];
    if (stopTime(cur, session) - stopTime(prev, session) > MAX_STOP_GAP_MS) {
      cut = i;
      break;
    }
  }
  const kept = ordered.slice(0, cut);

  let lastArrival = -1;
  for (let i = kept.length - 1; i >= 1; i--) {
    if (kept[i].kind === 'arrived' && kept[i].arrivedAt != null) {
      lastArrival = i;
      break;
    }
  }
  if (lastArrival < 1) {
    return { distanceMeters: 0, durationMs: 0, stops: [] };
  }

  const stops = kept.slice(0, lastArrival + 1);
  const distanceMeters = stops
    .slice(1)
    .reduce((sum, stop) => sum + stop.distanceFromPrevious, 0);
  const endedAt = stops[stops.length - 1].arrivedAt as number;
  return {
    distanceMeters,
    durationMs: Math.max(0, endedAt - session.startedAt),
    stops,
  };
};

export type RideStatsBucket = {
  // 区切りの始まり(週と月は日、年は月の初日)
  start: Date;
  distanceMeters: number;
};

export type RideLineStats = {
  lineId: number;
  lineName: string | null;
  lineColor: string | null;
  distanceMeters: number;
  // この路線を1駅間でも走った乗車の数
  rideCount: number;
};

export type RideStats = {
  distanceMeters: number;
  durationMs: number;
  rideCount: number;
  // グラフ用。週は曜日ごとの7つ、月は日ごとの日数ぶん、年は月ごとの12個
  buckets: RideStatsBucket[];
  // 乗った回数の多い順。同じ回数なら距離の長い順
  lines: RideLineStats[];
};

/**
 * 直通運転の接続駅は、駅リストに前の路線の駅と次の路線の駅として2回並ぶ
 * (src/utils/dropJunctionStation.ts)。到着判定がこの2つを行き来すると、同じ駅を
 * 続けて記録することがある。その2つ目は乗った駅間ではないので、路線の集計に数えない。
 * 間に駅を挟んで同じ駅に戻った記録(大江戸線の都庁前など)は、乗った駅間として残す。
 */
export const isJunctionDuplicate = (
  prev: RideStopRecord,
  stop: RideStopRecord
): boolean =>
  prev.stationGroupId != null &&
  prev.stationGroupId === stop.stationGroupId &&
  (stop.pathFromPrevious?.length ?? 0) === 0;

const createBuckets = (
  period: RidePeriod,
  range: RidePeriodRange
): RideStatsBucket[] => {
  const buckets: RideStatsBucket[] = [];
  let cursor = range.start;
  while (cursor < range.end) {
    buckets.push({ start: cursor, distanceMeters: 0 });
    cursor =
      period === 'year'
        ? new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
        : addDays(cursor, 1);
  }
  return buckets;
};

const findBucketIndex = (buckets: RideStatsBucket[], time: number): number => {
  for (let i = buckets.length - 1; i >= 0; i--) {
    if (buckets[i].start.getTime() <= time) {
      return i;
    }
  }
  return -1;
};

/**
 * 期間に乗りはじめた乗車をまとめる。range の外に乗りはじめた乗車は数えない。
 * 日付をまたいだ乗車は、乗りはじめた日(年は月)の区切りに入れる。
 */
export const summarizeRides = (
  sessions: RideSessionWithStops[],
  period: RidePeriod,
  range: RidePeriodRange
): RideStats => {
  const buckets = createBuckets(period, range);
  const lines = new Map<number, RideLineStats>();
  let distanceMeters = 0;
  let durationMs = 0;
  let rideCount = 0;

  const startMs = range.start.getTime();
  const endMs = range.end.getTime();

  for (const session of sessions) {
    if (session.startedAt < startMs || session.startedAt >= endMs) {
      continue;
    }
    const measured = measureRide(session);
    if (measured.stops.length === 0) {
      continue;
    }
    rideCount += 1;
    distanceMeters += measured.distanceMeters;
    durationMs += measured.durationMs;

    const bucketIndex = findBucketIndex(buckets, session.startedAt);
    if (bucketIndex >= 0) {
      buckets[bucketIndex].distanceMeters += measured.distanceMeters;
    }

    // 駅間の距離は、到着した側の駅の路線に数える(直通運転で路線が変わるため)
    const usedLines = new Set<number>();
    measured.stops.forEach((stop, index) => {
      if (
        index === 0 ||
        stop.lineId == null ||
        isJunctionDuplicate(measured.stops[index - 1], stop)
      ) {
        return;
      }
      const line = lines.get(stop.lineId) ?? {
        lineId: stop.lineId,
        lineName: stop.lineName,
        lineColor: stop.lineColor,
        distanceMeters: 0,
        rideCount: 0,
      };
      line.distanceMeters += stop.distanceFromPrevious;
      if (!usedLines.has(stop.lineId)) {
        usedLines.add(stop.lineId);
        line.rideCount += 1;
      }
      lines.set(stop.lineId, line);
    });
  }

  return {
    distanceMeters,
    durationMs,
    rideCount,
    buckets,
    lines: [...lines.values()].sort(
      (a, b) => b.rideCount - a.rideCount || b.distanceMeters - a.distanceMeters
    ),
  };
};
