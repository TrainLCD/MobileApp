import type * as Location from 'expo-location';
import getDistance from 'geolib/es/getDistance';
import { atom } from 'jotai';
import { LineType } from '~/@types/graphql';
import { BAD_ACCURACY_THRESHOLD } from '~/constants/threshold';
import { store } from '..';
import stationState from './station';

const MAX_ACCURACY_HISTORY = 12;

// 物理的にありえない速度でのジャンプを棄却する閾値(m/s ≒ 360km/h)
const MAX_PLAUSIBLE_SPEED = 100;
// GPS精度に応じたスムージング重みを返す（精度が良いほど新しい値を信頼する）
const getSmoothingAlpha = (accuracy: number | null): number => {
  if (accuracy == null || accuracy <= 0) {
    return 0.6;
  }
  if (accuracy < 50) {
    return 0.8;
  }
  if (accuracy < 200) {
    return 0.6;
  }
  return 0.3;
};

// 精度履歴の安定性を変動係数(CV)で判定する
const MIN_STABILITY_SAMPLES = 4;
const MAX_STABLE_CV = 0.5;

const isAccuracyStable = (history: number[]): boolean => {
  if (history.length < MIN_STABILITY_SAMPLES) {
    return false;
  }
  const mean = history.reduce((sum, v) => sum + v, 0) / history.length;
  if (mean <= 0 || mean >= BAD_ACCURACY_THRESHOLD) {
    return false;
  }
  const variance =
    history.reduce((sum, v) => sum + (v - mean) ** 2, 0) / history.length;
  const stddev = Math.sqrt(variance);
  return stddev / mean < MAX_STABLE_CV;
};

export const locationAtom = atom<Location.LocationObject | null>(null);
// MAX_PERMIT_ACCURACYフィルタで棄却される測位も含めた、継続測位の生の値。
// handleTrackingLocation経由でwatch/background双方が更新し、DevOverlayの診断表示で
// 「フィルタで棄却された精度」も確認できるようにする。
// DevOverlayはisDevApp時しか描画されないので、更新もそのとき（isDevApp）だけ行えば十分。
export const rawLocationAtom = atom<Location.LocationObject | null>(null);
export const accuracyHistoryAtom = atom<number[]>([]);
export const backgroundLocationTrackingAtom = atom(false);

// 直近の継続測位がMAX_PERMIT_ACCURACYを超え、ワープ対策フィルタで棄却されたかを表す。
// 棄却時は座標を捨てる（=locationAtomが前回値で凍結する）ため、精度の悪化は
// locationAtom側の精度には現れない。この事実を別フラグとして残すことで、到着判定など
// 下流の処理が「現在位置を信用できない＝走行中」と扱えるようにする。
export const locationAccuracyOutlierAtom = atom(false);

// 速度フィルタ・EMAスムージングの基準として使う「最後にフィルタ処理を通過した位置」
// 地下鉄モード中は更新しないため、モード復帰後にノイジーなprevで誤棄却されるのを防ぐ
const lastFilteredLocationAtom = atom<Location.LocationObject | null>(null);

// setLocation()を通過して受理された最後の実測位の時刻(ms)。ETAフォールバックの
// 無信号(staleness)判定に使う。store.set(locationAtom, …)の直書き(シミュレーション/
// フォールバックの座標スナップ)では更新されないことが重要で、GPSが実際に生きているか
// どうかをこの値の新しさだけで判定できるようにする。
export const lastAcceptedFixAtMsAtom = atom<number | null>(null);

// 上記と対になる「最後に受理された実測位の精度(m)」。フォールバックの座標スナップは
// locationAtom を accuracy:0 で直書きするため、locationAtom の精度だけを見ると
// 「良好測位が来た」と誤判定しうる。スナップの影響を受けないこの値で解除判定を行う。
export const lastAcceptedFixAccuracyAtom = atom<number | null>(null);

// 実移動(=電車が実際に動いている)を最後に観測した時刻(ms)。ETAフォールバックが
// 「駅で静止して待っているだけ」を「走行中」と誤認して位置を進めてしまう問題を防ぐため、
// GPS喪失直前に電車が動いていたかの判定に使う。人の静止・GPS凍結中は更新されない。
export const lastMovingAtMsAtom = atom<number | null>(null);

// 移動検知用の直近サンプル(受理測位の座標+時刻)。lastFilteredLocationは地下鉄スキップ
// 経路で更新されないため、全受理経路で更新する専用サンプルを使う。
const lastMotionSampleAtom = atom<{
  latitude: number;
  longitude: number;
  timestampMs: number;
} | null>(null);

// 実移動とみなす正味変位の下限(m)。粗い測位のジッタ(±精度)を超える移動のみ拾うため、
// 精度と併せて max を取る。閾値以下ではサンプルを更新せず、真の移動でのみ超えるよう
// 変位を蓄積する(徒歩・静止ジッタの誤検知を抑える)。
const MOTION_MIN_DISTANCE_M = 150;

// 受理測位ごとに、直前サンプルからの正味変位で実移動(=電車が動いている)を検知して
// 打刻する。ジッタ(≤max(150m, 精度))は無視、ワープ(>MAX_PLAUSIBLE_SPEED)も除外。
// GPS凍結(棄却)中は受理測位が来ないため呼ばれず、駅で待機中に誤って移動と判定しない。
const recordMotion = (
  location: Location.LocationObject,
  nowMs: number
): void => {
  const prev = store.get(lastMotionSampleAtom);
  const { latitude, longitude, accuracy } = location.coords;
  if (prev == null) {
    store.set(lastMotionSampleAtom, {
      latitude,
      longitude,
      timestampMs: nowMs,
    });
    return;
  }
  const dist = getDistance(
    { latitude: prev.latitude, longitude: prev.longitude },
    { latitude, longitude }
  );
  const dtSec = (nowMs - prev.timestampMs) / 1000;
  const speed = dtSec > 0 ? dist / dtSec : 0;
  const threshold = Math.max(MOTION_MIN_DISTANCE_M, accuracy ?? 0);
  if (dist > threshold && speed < MAX_PLAUSIBLE_SPEED) {
    store.set(lastMovingAtMsAtom, nowMs);
    store.set(lastMotionSampleAtom, {
      latitude,
      longitude,
      timestampMs: nowMs,
    });
  }
};

// テスト用: モジュール内部の状態をリセットする
export const resetLocationState = () => {
  store.set(locationAtom, null);
  store.set(rawLocationAtom, null);
  store.set(accuracyHistoryAtom, []);
  store.set(lastFilteredLocationAtom, null);
  store.set(locationAccuracyOutlierAtom, false);
  store.set(lastAcceptedFixAtMsAtom, null);
  store.set(lastAcceptedFixAccuracyAtom, null);
  store.set(lastMovingAtMsAtom, null);
  store.set(lastMotionSampleAtom, null);
};

// ワープ対策フィルタによる棄却有無を記録する。handleTrackingLocationから
// フィルタ判定の都度呼び出すこと。
export const setLocationAccuracyOutlier = (isOutlier: boolean) => {
  store.set(locationAccuracyOutlierAtom, isOutlier);
};

// MAX_PERMIT_ACCURACYフィルタで棄却される測位も含め、生の測位値を記録する。
// startLocationUpdatesAsync経路ではフィルタがsetLocation到達前に値を捨てるため、
// フィルタ前に本関数を呼ぶことで生の精度をDevOverlayから観測できるようにする。
// 呼び出し側でisDevApp判定を行い、本番ビルドでは更新しないこと。
export const setRawLocation = (location: Location.LocationObject) => {
  store.set(rawLocationAtom, location);
};

// 受理した測位が反映される唯一の入口。継続測位の正常系に加え、ワンショット取得や
// 手動選択(StationSearchModal/useInitialNearbyStation/Privacy等)もここを通る。
export const setLocation = (location: Location.LocationObject) => {
  // 新しい測位を受け取った時点で「直近の測位が精度外れ値だった」状態は解消されるため、
  // ここで外れ値フラグを解除する。解除をhandleTrackingLocationだけに置くと、継続測位で
  // 一度立ったフラグがdirect setLocation経由の良好な測位では解除されず、arrivedがfalseに
  // 張り付く。座標棄却(speedフィルタ)で早期returnする経路でも精度自体は良好なため、
  // フィルタ判定より前で解除する。
  store.set(locationAccuracyOutlierAtom, false);

  const nowMs = Date.now();
  const filteredPrev = store.get(lastFilteredLocationAtom);
  const currentHistory = store.get(accuracyHistoryAtom);
  const newAccuracy = location.coords.accuracy;

  const updatedHistory =
    newAccuracy != null && Number.isFinite(newAccuracy) && newAccuracy >= 0
      ? [...currentHistory, newAccuracy].slice(-MAX_ACCURACY_HISTORY)
      : currentHistory;

  // 地下鉄ではGPS信号が不安定なため原則スムージングをスキップするが、
  // 精度が安定している場合（地上区間など）はスムージングを適用する
  const currentLineType = store.get(stationState).station?.line?.lineType;
  const skipSmoothing =
    currentLineType === LineType.Subway && !isAccuracyStable(updatedHistory);

  // スムージングスキップ時はフィルタ・スムージングを全てスキップする
  // UIには生の座標を反映するが、フィルタ基準(lastFilteredLocationAtom)は更新しない
  if (skipSmoothing) {
    store.set(locationAtom, location);
    store.set(accuracyHistoryAtom, updatedHistory);
    store.set(lastAcceptedFixAtMsAtom, nowMs);
    store.set(lastAcceptedFixAccuracyAtom, newAccuracy ?? null);
    recordMotion(location, nowMs);
    return;
  }

  // フィルタ基準となるprevが無い場合（初回起動時や地下鉄→地上の復帰直後）
  if (filteredPrev == null) {
    store.set(locationAtom, location);
    store.set(lastFilteredLocationAtom, location);
    store.set(accuracyHistoryAtom, updatedHistory);
    store.set(lastAcceptedFixAtMsAtom, nowMs);
    store.set(lastAcceptedFixAccuracyAtom, newAccuracy ?? null);
    recordMotion(location, nowMs);
    return;
  }

  // 前回の座標が存在する場合、速度ベースの異常値フィルタを適用
  const dt = (location.timestamp - filteredPrev.timestamp) / 1000; // 秒
  if (dt > 0) {
    const dist = getDistance(
      {
        latitude: filteredPrev.coords.latitude,
        longitude: filteredPrev.coords.longitude,
      },
      {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      }
    );
    const speed = dist / dt;

    // 物理的にありえない速度の場合は座標を棄却し、前回値を維持する
    if (speed > MAX_PLAUSIBLE_SPEED) {
      store.set(accuracyHistoryAtom, updatedHistory);
      return;
    }
  }

  // EMA(指数移動平均)で座標をスムージングする
  // 精度が良いほどαが大きくなり、新しい測位値をより信頼する
  const alpha = getSmoothingAlpha(newAccuracy);
  const smoothedLat =
    alpha * location.coords.latitude +
    (1 - alpha) * filteredPrev.coords.latitude;
  const smoothedLon =
    alpha * location.coords.longitude +
    (1 - alpha) * filteredPrev.coords.longitude;

  const smoothedLocation: Location.LocationObject = {
    ...location,
    coords: {
      ...location.coords,
      latitude: smoothedLat,
      longitude: smoothedLon,
    },
  };

  store.set(locationAtom, smoothedLocation);
  store.set(lastFilteredLocationAtom, smoothedLocation);
  store.set(accuracyHistoryAtom, updatedHistory);
  store.set(lastAcceptedFixAtMsAtom, nowMs);
  store.set(lastAcceptedFixAccuracyAtom, newAccuracy ?? null);
  // 移動検知は生の測位座標(smoothedではなく実測変位)で行う。
  recordMotion(location, nowMs);
};
