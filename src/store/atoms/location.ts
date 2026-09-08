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

// 速度フィルタが連続して棄却できる回数の上限。棄却しても基準座標は更新しないため、
// 基準側が実際の現在地から乖離している場合は正常な測位が延々と弾かれ、位置が
// 永久に凍結する。この回数に達したら「基準の方が誤っている」と判断し、届いた
// 測位で基準を張り直す。
const MAX_CONSECUTIVE_SPEED_REJECTIONS = 5;

// 基準座標がこれ以上古い場合、EMAの基準としては意味を持たないため、速度フィルタを
// 通過したうえでスムージングせず新しい測位へスナップし、基準を張り直す。
// バックグラウンド測位の抑止(「常に許可」未設定)やトンネルで測位が数十分途切れた
// あと、EMAで混ぜると新しい測位のα割しか反映されず、残った遅れがそのまま次の
// 変位へ乗って再び速度超過になる、という復帰不能ループを防ぐ。
const STALE_REFERENCE_MS = 30_000;

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

// EMAスムージングの基準として使う「最後にフィルタ処理を通過した位置」
// 地下鉄モード中は更新しないため、モード復帰後にノイジーなprevで誤棄却されるのを防ぐ
const lastFilteredLocationAtom = atom<Location.LocationObject | null>(null);

// 速度フィルタの基準として使う「最後に受理した“生の”座標」。
// EMA後の座標を基準にすると、EMAの追従遅れ(定速時 ((1-α)/α)·v·dt)が変位へ上乗せ
// され、算出速度が実速度の 1/α 倍に膨らむ。実効的なしきい値が α×360km/h まで下がり、
// 精度が良くても288km/h、精度200m超では108km/hで棄却が始まるため、新幹線の320km/h
// 走行が丸ごと弾かれて位置が凍結していた。速度判定は生座標同士で行う。
const lastRawLocationAtom = atom<Location.LocationObject | null>(null);

// 速度フィルタが連続で棄却した回数。MAX_CONSECUTIVE_SPEED_REJECTIONSの判定に使う。
let consecutiveSpeedRejections = 0;

// テスト用: モジュール内部の状態をリセットする
export const resetLocationState = () => {
  store.set(locationAtom, null);
  store.set(rawLocationAtom, null);
  store.set(accuracyHistoryAtom, []);
  store.set(lastFilteredLocationAtom, null);
  store.set(lastRawLocationAtom, null);
  store.set(locationAccuracyOutlierAtom, false);
  consecutiveSpeedRejections = 0;
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

// スムージングせず測位をそのまま反映し、EMA基準・速度フィルタ基準の双方を張り直す。
// 基準が無い(初回起動・地下鉄からの復帰)、基準が古すぎる、基準が誤っていると判断した
// 場合に使う。基準を両方とも生の測位へ揃えるのが要点で、片方だけ残すと次回の変位に
// 古い遅れが乗って誤棄却の引き金になる。
const resyncLocationReference = (
  location: Location.LocationObject,
  updatedHistory: number[]
) => {
  store.set(locationAtom, location);
  store.set(lastFilteredLocationAtom, location);
  store.set(lastRawLocationAtom, location);
  store.set(accuracyHistoryAtom, updatedHistory);
  consecutiveSpeedRejections = 0;
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

  const filteredPrev = store.get(lastFilteredLocationAtom);
  const rawPrev = store.get(lastRawLocationAtom);
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
  // UIには生の座標を反映するが、EMA基準(lastFilteredLocationAtom)も速度フィルタ基準
  // (lastRawLocationAtom)も更新しない。地上復帰時は基準が古いためSTALE_REFERENCE_MSの
  // 判定に掛かり、そこで張り直される
  if (skipSmoothing) {
    store.set(locationAtom, location);
    store.set(accuracyHistoryAtom, updatedHistory);
    return;
  }

  // 基準が無い場合（初回起動時や地下鉄→地上の復帰直後）
  if (filteredPrev == null || rawPrev == null) {
    resyncLocationReference(location, updatedHistory);
    return;
  }

  // 前回の座標が存在する場合、速度ベースの異常値フィルタを適用する。
  // 基準は「生の前回座標」であってEMA後の座標ではない（lastRawLocationAtom参照）。
  //
  // 測位が長く途切れたあとでも、このフィルタは先に必ず通す。意味を失うのはEMAの方
  // (下のSTALE_REFERENCE_MS判定)だけで、変位÷経過時間という速度の妥当性検査は
  // 経過時間が延びても成立するため。ここを飛ばすと、間隔が空いた直後の1点に限って
  // ワープ対策が無効になる。
  const dt = (location.timestamp - rawPrev.timestamp) / 1000; // 秒
  if (dt > 0) {
    const dist = getDistance(
      {
        latitude: rawPrev.coords.latitude,
        longitude: rawPrev.coords.longitude,
      },
      {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      }
    );
    const speed = dist / dt;

    // 物理的にありえない速度の場合は座標を棄却し、前回値を維持する
    if (speed > MAX_PLAUSIBLE_SPEED) {
      consecutiveSpeedRejections += 1;
      // 棄却が続くのは基準側が誤っている可能性が高い。位置が凍結したまま
      // 復帰できなくなるのを避けるため、上限に達したら基準を張り直す。
      if (consecutiveSpeedRejections >= MAX_CONSECUTIVE_SPEED_REJECTIONS) {
        resyncLocationReference(location, updatedHistory);
        return;
      }
      store.set(accuracyHistoryAtom, updatedHistory);
      return;
    }
  }

  consecutiveSpeedRejections = 0;

  // 速度としては妥当だが基準が古すぎる場合、EMAの基準としては使えないため
  // スムージングせず生の座標へスナップして基準を張り直す。長く途切れたあとに
  // EMAで混ぜると新しい測位のα割しか反映されず、残った遅れが次回の変位へ乗って
  // 再棄却…という復帰不能ループの原因になる。
  if (location.timestamp - rawPrev.timestamp > STALE_REFERENCE_MS) {
    resyncLocationReference(location, updatedHistory);
    return;
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
  // 速度フィルタの基準はスムージング前の生座標を保持する
  store.set(lastRawLocationAtom, location);
  store.set(accuracyHistoryAtom, updatedHistory);
};
