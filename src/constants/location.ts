import * as Location from 'expo-location';

export const LOCATION_TASK_NAME = 'trainlcd-background-location-task';
export const LOCATION_ACCURACY = Location.Accuracy.Highest;
export const LOCATION_DISTANCE_INTERVAL = 5;
export const LOCATION_TIME_INTERVAL = 3000;

export const MAX_PERMIT_ACCURACY = 4000;

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
