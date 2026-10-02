// trainRoute の Estimated が返す到着・出発の見込みに合わせて走らせるための計算。
// オートモード (useSimulationMode) と GPX の生成 (scripts/generate-location-gpx.mjs) が
// 同じ関数を使い、どちらも ETA (estimateArrivalTimes) と同じ時間で走る。

// scripts/generate-location-gpx.mjs が Node から直接読むので、このファイルは何も import しない
// (Node は拡張子の無い相対 import を解決できない)。

export type StopTiming = {
  /** 始点からの到着の見込み (秒) */
  arrivalSec: number;
  /** 始点からの出発の見込み (秒) */
  departureSec: number;
};

export type LegTiming = {
  /** 停車駅から次の停車駅までの走行時間 (秒) */
  runSec: number;
  /**
   * 着いた駅での停車時間 (秒)。終点は 0。推定がその駅を通過扱いにしていて
   * 見込みが無いときは null
   */
  dwellSec: number | null;
};

/**
 * 距離 distance(m) を加速度 accel・減速度 decel の台形 (短い区間は三角形) で
 * seconds 秒かけて走る巡航速度 (m/s)。台形の所要時間は T(v) = D/v + k·v
 * (k = 1/(2a) + 1/(2b)) なので、T(v) = seconds の 2 根のうち遅い方 (巡航のある
 * 台形) を返す。最短時間 2√(D·k) より短い時間を求められたときは解が無いので、
 * 最短時間で走る速度 √(D/k) を返し、shortened を立てる。
 */
export const cruiseSpeedForDuration = (
  distance: number,
  seconds: number,
  accel: number,
  decel: number
): { speed: number; shortened: boolean } | null => {
  const valid = (x: number) => Number.isFinite(x) && x > 0;
  if (!(valid(distance) && valid(accel) && valid(decel))) {
    return null;
  }
  const k = 0.5 / accel + 0.5 / decel;
  const fastest = Math.sqrt(distance / k);
  const discriminant = seconds * seconds - 4 * k * distance;
  if (!Number.isFinite(seconds) || discriminant <= 0) {
    return { speed: fastest, shortened: true };
  }
  return {
    speed: (seconds - Math.sqrt(discriminant)) / (2 * k),
    shortened: false,
  };
};

/**
 * 停車駅ごとの走行時間と停車時間 (秒) を、駅ごとの見込みから組み立てる。
 * 戻り値の [j] は stopIndices[j] から stopIndices[j + 1] までの走行と、着いた駅での停車。
 * 見込みの無い駅があれば null (バスの経路など、推定のモデルの対象外)。
 *
 * 停車駅は呼び出し側の規則 (アプリの isPass など) で決める。推定は平日/休日運転の
 * 駅を常に停車扱いにするので、呼び出し側では通過する駅に推定だけが停まることがある。
 * その駅の停車時間 (出発 − 到着) は走行時間から引く。逆に、呼び出し側で停まる駅を
 * 推定が通過していると停車時間の見込みが無いので、dwellSec を null にする。
 * dwellOverrideSec を渡すと、途中の停車駅の停車時間をすべてその値にする。
 */
export const planLegTimings = (
  timings: (StopTiming | null | undefined)[],
  stopIndices: number[],
  dwellOverrideSec?: number
): LegTiming[] | null => {
  const known: StopTiming[] = [];
  for (const timing of timings) {
    if (timing == null) {
      return null;
    }
    known.push(timing);
  }
  const dwellAt = (i: number) => known[i].departureSec - known[i].arrivalSec;
  return stopIndices.slice(1).map((to, j) => {
    const from = stopIndices[j];
    let runSec = known[to].arrivalSec - known[from].departureSec;
    for (let i = from + 1; i < to; i++) {
      runSec -= dwellAt(i);
    }
    const isFinal = j === stopIndices.length - 2;
    if (isFinal) {
      return { runSec, dwellSec: 0 };
    }
    if (dwellOverrideSec !== undefined) {
      return { runSec, dwellSec: dwellOverrideSec };
    }
    const dwellSec = Math.round(dwellAt(to));
    return { runSec, dwellSec: dwellSec > 0 ? dwellSec : null };
  });
};

/**
 * trainRoute の segment の累積分 (arrivalCumulativeMinutes / departureCumulativeMinutes)
 * を秒の見込みにする。どちらかが無ければ null (Legacy の値や、バスの経路)。
 */
export const toStopTiming = (
  segment:
    | {
        arrivalCumulativeMinutes?: number | null;
        departureCumulativeMinutes?: number | null;
      }
    | null
    | undefined
): StopTiming | null => {
  const arrival = segment?.arrivalCumulativeMinutes;
  const departure = segment?.departureCumulativeMinutes;
  if (
    arrival == null ||
    departure == null ||
    !Number.isFinite(arrival) ||
    !Number.isFinite(departure)
  ) {
    return null;
  }
  return { arrivalSec: arrival * 60, departureSec: departure * 60 };
};

/**
 * 距離 distance(m) を加速度 accel・減速度 decel の台形で seconds 秒かけて走るときの、
 * 1 秒ごとの進み (m。1 秒あたりなので速度 m/s と同じ値)。
 *
 * 台形の位置 x(t) から x(t) − x(t − 1) を並べるので、列の長さは seconds (整数に丸めた値)
 * ちょうどで、合計は distance になる。generateTrainSpeedProfile は加速・巡航・減速を
 * それぞれ 1 秒単位で切り上げて並べるため、同じ巡航速度でも列の長さが式の時間から
 * 1〜2 秒ずれ、巡航速度を選び直しても合わないことがある。
 * 最短時間より短い時間は走り切れないので、最短時間 (三角形) の列を返して shortened を
 * 立てる。加減速が決まらないときや距離が 0 のときは null。
 */
export const speedProfileForDuration = ({
  distance,
  seconds,
  accel,
  decel,
}: {
  distance: number;
  seconds: number;
  accel: number;
  decel: number;
}): { profile: number[]; shortened: boolean } | null => {
  const fitted = cruiseSpeedForDuration(
    distance,
    Math.round(seconds),
    accel,
    decel
  );
  if (!fitted) {
    return null;
  }
  const v = fitted.speed;
  const accelTime = v / accel;
  const decelTime = v / decel;
  const accelDistance = (v * v) / (2 * accel);
  const decelDistance = (v * v) / (2 * decel);
  const cruiseTime = Math.max(
    0,
    (distance - accelDistance - decelDistance) / v
  );
  const total = accelTime + cruiseTime + decelTime;
  const positionAt = (t: number): number => {
    if (t <= 0) {
      return 0;
    }
    if (t >= total) {
      return distance;
    }
    if (t <= accelTime) {
      return (accel * t * t) / 2;
    }
    if (t <= accelTime + cruiseTime) {
      return accelDistance + v * (t - accelTime);
    }
    const remaining = total - t;
    return distance - (decel * remaining * remaining) / 2;
  };
  // 浮動小数の誤差で total が整数をわずかに超えても、1 秒ぶんの点を増やさない
  const length = Math.max(1, Math.ceil(total - 1e-6));
  const profile: number[] = [];
  for (let t = 1; t <= length; t++) {
    profile.push(positionAt(t) - positionAt(t - 1));
  }
  return { profile, shortened: fitted.shortened };
};
