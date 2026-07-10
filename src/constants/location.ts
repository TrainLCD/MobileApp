import * as Location from 'expo-location';

export const LOCATION_TASK_NAME = 'trainlcd-background-location-task';
export const LOCATION_ACCURACY = Location.Accuracy.Highest;
// 省電力測位モード(実験的機能)時の要求精度。iOSでは kCLLocationAccuracyBest →
// kCLLocationAccuracyNearestTenMeters(約10m粒度)へ一段下がり電池消費を抑えられる。
// Androidでは Highest / High とも PRIORITY_HIGH_ACCURACY にマップされるため挙動は変わらない。
// 到着判定の閾値は最小でも100m+精度ボーナスのため、10m粒度でも判定精度への実害はない想定。
export const LOCATION_ACCURACY_POWER_SAVING = Location.Accuracy.High;
export const LOCATION_DISTANCE_INTERVAL = 10;
export const LOCATION_TIME_INTERVAL = 5000;

// 最大許容精度(m)のフォールバック既定値。実効値は Worker の /config/remote が返す
// max_permit_accuracy を参照する（src/lib/remoteConfig.ts の getMaxPermitAccuracy）。
// リモート値が未取得・不正な場合はこの値にフォールバックする。
export const MAX_PERMIT_ACCURACY = 1500;

export const LOCATION_START_MAX_RETRIES = 3;
export const LOCATION_START_RETRY_BASE_DELAY_MS = 1000;

export const LOCATION_WATCH_OPTIONS: Location.LocationOptions = {
  accuracy: LOCATION_ACCURACY,
  distanceInterval: LOCATION_DISTANCE_INTERVAL,
  timeInterval: LOCATION_TIME_INTERVAL,
} as const;

export const LOCATION_TASK_OPTIONS: Location.LocationTaskOptions = {
  ...LOCATION_WATCH_OPTIONS,
  // expo-task-managerはバックグラウンドでJobScheduler経由でJS側にデータを配信する。
  // deferredUpdatesを両方0にするとFLPの更新ごとにジョブがスケジュールされ、
  // Android 16でクォータ超過によりバックグラウンド更新が停止する。
  // distanceは0にしないと停車中に更新が届かなくなる（AND条件のため）
  deferredUpdatesInterval: LOCATION_TIME_INTERVAL,
  deferredUpdatesDistance: 0,
  pausesUpdatesAutomatically: false,
} as const;
