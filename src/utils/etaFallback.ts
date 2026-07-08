// ETAフォールバック(精度劣化・喪失時にETAデータで接近/到着状態を推定する機能)の
// ドメイン型と純関数。ストアやReactに依存させず、単体テスト可能に保つ。

/**
 * ETAフォールバックで使用する停車駅情報。
 * estimateArrivalTimes の stops から stopsHere === true のみを抽出し、
 * 進行方向順・絶対累積分(from駅基準)のまま渡すこと。
 */
export type EtaFallbackStop = {
  stationId: number;
  /** from駅基準の累積到着分(絶対値) */
  cumulativeMinutes: number;
  /** from駅基準の累積発車分(絶対値) */
  departureCumulativeMinutes: number;
};

/**
 * GPSで最後に確定した駅イベント。
 * AT_STATION: その駅に到着している状態を最後に観測した時刻
 * DEPARTED: その駅からの発車(arrived true→false 遷移)を観測した時刻
 */
export type EtaAnchor = {
  stationId: number;
  kind: 'AT_STATION' | 'DEPARTED';
  observedAtMs: number;
};

/** ETA仮想時計から推定した現在の走行フェーズ */
export type EtaPhase =
  | { kind: 'RUNNING'; targetStationId: number }
  | { kind: 'APPROACHING'; targetStationId: number }
  | { kind: 'DWELLING'; stationId: number };

export type EstimateEtaPhaseOptions = {
  /**
   * 到着確定マージン(分)。ETA上の到着時刻からこの時間が経過するまでは
   * APPROACHING に留め、遅延時に早すぎる到着確定を防ぐ。
   */
  arrivalConfirmMarginMin: number;
  /**
   * 最小停車時間(分)。ETAデータの分解能で発車分−到着分が0になる駅の
   * 停車時間をこの値へ底上げする。
   */
  minDwellMin: number;
};

/**
 * 接近リード係数。直前発車から当駅到着までの走行時間に対して、
 * この割合だけ手前を「まもなく(APPROACHING)」の開始点とする。
 * 地下鉄の駅間約2分では 2*0.4=0.8 分 ≒ 到着48秒前で「まもなく」となり、
 * GPS版 approachingThreshold(駅間距離/2)の体感と概ね揃う。
 */
export const APPROACH_LEAD_RATIO = 0.4;

/** 接近リードの下限(分)。極端に短い駅間でも最低これだけ手前で接近扱いにする。 */
export const APPROACH_LEAD_MIN_MIN = 0.5;

/** 接近リードの上限(分)。長い駅間でも接近開始が早すぎないよう頭打ちにする。 */
export const APPROACH_LEAD_MAX_MIN = 1.5;

/**
 * 「電車が実際に動いていた」とみなす有効期間(ms)。GPS喪失の直前この時間内に実移動が
 * 観測されていれば R2 の発動・発車(DEPARTED)記録を許可する。静止が続くと期限切れになり、
 * 駅で待機中に位置が勝手に進む誤動作を防ぐ(motion gate)。実機チューニング前提。
 */
export const MOVING_RECENCY_MS = 90_000;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/**
 * ETAデータとGPSで最後に確定した駅イベント(アンカー)からの経過時間で、
 * 現在の走行フェーズ(走行中/接近中/停車中)を推定する純関数。
 *
 * 前提: stops は stopsHere === true のみ・進行方向順・絶対累積分。
 * 呼び出し側(フック)が保証する。
 *
 * @returns 推定フェーズ。アンカー駅が stops に無い場合は発動不可として null。
 */
export const estimateEtaPhase = (
  stops: EtaFallbackStop[],
  anchor: EtaAnchor,
  nowMs: number,
  options: EstimateEtaPhaseOptions
): EtaPhase | null => {
  const { arrivalConfirmMarginMin, minDwellMin } = options;

  // アンカー駅の位置。空配列や未収録データはここで null になり発動不可。
  const i0 = stops.findIndex((s) => s.stationId === anchor.stationId);
  if (i0 === -1) {
    return null;
  }

  // 仮想時計の基準分と走査開始位置をアンカー種別で決める。
  // DEPARTED: 発車分を基準に次駅から評価。
  // AT_STATION: 到着分を基準に自駅から評価(観測喪失時点を到着直後とみなす保守的モデル)。
  const anchorStop = stops[i0];
  const base =
    anchor.kind === 'DEPARTED'
      ? anchorStop.departureCumulativeMinutes
      : anchorStop.cumulativeMinutes;
  const scanStart = anchor.kind === 'DEPARTED' ? i0 + 1 : i0;

  // 現在の仮想累積分(基準分 + アンカー観測からの経過分)。
  const m = base + (nowMs - anchor.observedAtMs) / 60_000;

  const terminalStationId = stops[stops.length - 1].stationId;

  // 直前停車駅の生の発車累積分。走査先頭では base を用いる。
  let prevDep = base;

  for (let i = scanStart; i < stops.length; i += 1) {
    const stop = stops[i];
    const arr = stop.cumulativeMinutes;

    // AT_STATION アンカーの自駅は到着済みなので接近判定をスキップし、
    // マージン非加算の effDep で DWELLING 判定のみ行う。
    if (anchor.kind === 'AT_STATION' && i === i0) {
      const effDep = Math.max(
        stop.departureCumulativeMinutes,
        arr + minDwellMin
      );
      if (m < effDep) {
        return { kind: 'DWELLING', stationId: stop.stationId };
      }
      prevDep = stop.departureCumulativeMinutes;
      continue;
    }

    // 到着確定はマージン経過後。発車は到着確定+最小停車を満たすまで待つ。
    const effArr = arr + arrivalConfirmMarginMin;
    const effDep = Math.max(
      stop.departureCumulativeMinutes,
      effArr + minDwellMin
    );
    // 接近リードは駅間走行時間に比例させ 0.5〜1.5 分に clamp。
    // 走行時間が短い場合 lead が区間長を超えてよい(発車直後から「まもなく」)。
    const lead = clamp(
      (arr - prevDep) * APPROACH_LEAD_RATIO,
      APPROACH_LEAD_MIN_MIN,
      APPROACH_LEAD_MAX_MIN
    );

    if (m < arr - lead) {
      return { kind: 'RUNNING', targetStationId: stop.stationId };
    }
    if (m < effArr) {
      return { kind: 'APPROACHING', targetStationId: stop.stationId };
    }
    if (m < effDep) {
      return { kind: 'DWELLING', stationId: stop.stationId };
    }

    // この駅は発車済み。前進のみで評価するため単調でないデータでもクラッシュしない。
    prevDep = stop.departureCumulativeMinutes;
  }

  // 終端を過ぎても該当なし → 終端で停止(突き抜けない)。
  return { kind: 'DWELLING', stationId: terminalStationId };
};
