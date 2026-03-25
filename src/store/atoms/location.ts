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
export const accuracyHistoryAtom = atom<number[]>([]);
export const backgroundLocationTrackingAtom = atom(false);

// 速度フィルタ・EMAスムージングの基準として使う「最後にフィルタ処理を通過した位置」
// 地下鉄モード中は更新しないため、モード復帰後にノイジーなprevで誤棄却されるのを防ぐ
const lastFilteredLocationAtom = atom<Location.LocationObject | null>(null);

export const setLocation = (location: Location.LocationObject) => {
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
    return;
  }

  // フィルタ基準となるprevが無い場合（初回起動時や地下鉄→地上の復帰直後）
  if (filteredPrev == null) {
    store.set(locationAtom, location);
    store.set(lastFilteredLocationAtom, location);
    store.set(accuracyHistoryAtom, updatedHistory);
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
};
