import * as Location from 'expo-location';

export const LOCATION_TASK_NAME = 'trainlcd-background-location-task';
// 旧・省電力測位モードの精度と更新間隔を実車検証を経て既定値へ昇格した。
// 駅判定の信頼性を維持するためHighを使用する。iOSではkCLLocationAccuracyBestから
// NearestTenMetersへ一段下がる。AndroidではHighestと同じ高精度プロバイダを維持し、
// 更新間隔の緩和によって電池消費と発熱を抑える。
export const LOCATION_ACCURACY = Location.Accuracy.High;
export const LOCATION_DISTANCE_INTERVAL = 25;
export const LOCATION_TIME_INTERVAL = 10000;

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
  // バッチ間隔は更新間隔に合わせ、バックグラウンドでのJS起床回数を抑える。
  deferredUpdatesInterval: LOCATION_TIME_INTERVAL,
  deferredUpdatesDistance: 0,
  pausesUpdatesAutomatically: false,
} as const;

// 省電力測位モード(実験的機能)。精度・更新間隔は既定値と共通で、
// 停車中の測位自動休止(iOSのみ)だけを追加で許可する。
export const LOCATION_TASK_OPTIONS_POWER_SAVING: Location.LocationTaskOptions =
  {
    ...LOCATION_TASK_OPTIONS,
    // 停車中はiOSに測位ハードウェアの休止を許可し、移動再開時にOtherNavigationの
    // 活動種別を手掛かりとして自動再開させる。
    pausesUpdatesAutomatically: true,
  } as const;
