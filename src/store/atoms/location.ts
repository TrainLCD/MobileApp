import type * as Location from 'expo-location';
import getDistance from 'geolib/es/getDistance';
import { atom } from 'jotai';
import { store } from '..';

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

export const locationAtom = atom<Location.LocationObject | null>(null);
export const accuracyHistoryAtom = atom<number[]>([]);
export const backgroundLocationTrackingAtom = atom(false);

export const setLocation = (location: Location.LocationObject) => {
  const prev = store.get(locationAtom);
  const currentHistory = store.get(accuracyHistoryAtom);
  const newAccuracy = location.coords.accuracy;

  const updatedHistory =
    newAccuracy != null && Number.isFinite(newAccuracy) && newAccuracy >= 0
      ? [...currentHistory, newAccuracy].slice(-MAX_ACCURACY_HISTORY)
      : currentHistory;

  // 前回の座標が存在する場合、速度ベースの異常値フィルタを適用
  if (prev != null) {
    const dt = (location.timestamp - prev.timestamp) / 1000; // 秒
    if (dt > 0) {
      const dist = getDistance(
        {
          latitude: prev.coords.latitude,
          longitude: prev.coords.longitude,
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
      alpha * location.coords.latitude + (1 - alpha) * prev.coords.latitude;
    const smoothedLon =
      alpha * location.coords.longitude + (1 - alpha) * prev.coords.longitude;

    const smoothedLocation: Location.LocationObject = {
      ...location,
      coords: {
        ...location.coords,
        latitude: smoothedLat,
        longitude: smoothedLon,
      },
    };

    store.set(locationAtom, smoothedLocation);
    store.set(accuracyHistoryAtom, updatedHistory);
    return;
  }

  // 初回はそのまま格納
  store.set(locationAtom, location);
  store.set(accuracyHistoryAtom, updatedHistory);
};
