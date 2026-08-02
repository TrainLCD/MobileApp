import * as Location from 'expo-location';
import { Platform } from 'react-native';

export const LOCATION_TASK_NAME = 'trainlcd-background-location-task';
// 旧・省電力測位モードの精度と更新間隔を実車検証を経て既定値へ昇格した。
// 駅判定の信頼性を維持するためHighを使用する。iOSではkCLLocationAccuracyBestから
// NearestTenMetersへ一段下がる。AndroidではHighestと同じ高精度プロバイダを維持し、
// 更新間隔の緩和によって電池消費と発熱を抑える。
export const LOCATION_ACCURACY = Location.Accuracy.High;
// 省電力測位モード(実験的機能)では電池優先のBalancedまで精度を下げる。iOSでは
// kCLLocationAccuracyHundredMeters、AndroidではGPSを常用しない省電力プロバイダに
// なるため、駅判定の精度低下と引き換えに電池消費をさらに抑える。
export const LOCATION_ACCURACY_POWER_SAVING = Location.Accuracy.Balanced;

// 更新間隔(ms)。expo-locationのtimeIntervalはAndroid専用で、iOSでは無視される。
export const LOCATION_TIME_INTERVAL = 10000;

// 前回配信位置からの最小移動距離(m)。到着判定は「駅に停車している間」に確定させる
// 必要があるが、この値が0より大きいとOSは変位が閾値に達するまで測位を配信しないため、
// 停車中(=変位ほぼ0)は測位が途絶える。すると到着判定は減速中に届いた最後の1点だけに
// 依存し、その1点が駅の手前で凍結する・精度外れ値として棄却される(棄却フラグは次の
// 受理まで解除されないため到着がfalseで固着する)といった取りこぼしが起きる。
//
// Android: timeIntervalとのAND条件で配信されるため、変位ゲートを外しても更新頻度は
//   timeInterval(10秒)が抑える。停車中も10秒ごとに測位が届き、EMAスムージングも
//   数サンプルで実位置へ収束する。
// iOS: timeIntervalが効かずdistanceInterval(CLLocationManager.distanceFilter)だけが
//   更新頻度を決めるため、0にすると約1Hzで配信され電池を著しく消費する。実車検証済みの
//   旧既定値10mへ戻す。10mであれば停車中もGPSの揺らぎで測位が届き続ける一方、25mでは
//   揺らぎが閾値を超えず停車中の更新が止まりやすい。
export const LOCATION_DISTANCE_INTERVAL = Platform.OS === 'ios' ? 10 : 0;

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

export const LOCATION_WATCH_OPTIONS_POWER_SAVING: Location.LocationOptions = {
  ...LOCATION_WATCH_OPTIONS,
  accuracy: LOCATION_ACCURACY_POWER_SAVING,
} as const;

export const LOCATION_TASK_OPTIONS: Location.LocationTaskOptions = {
  ...LOCATION_WATCH_OPTIONS,
  // expo-task-managerはバックグラウンドでJobScheduler経由でJS側にデータを配信する。
  // deferredUpdatesを両方0にするとFLPの更新ごとにジョブがスケジュールされ、
  // Android 16でクォータ超過によりバックグラウンド更新が停止する。
  // distanceは0にしないと停車中に更新が届かなくなる（AND条件のため）。
  // 同じ理由でLocationRequest側の変位ゲート(LOCATION_DISTANCE_INTERVAL)もAndroidでは0。
  // バッチ間隔は更新間隔に合わせ、バックグラウンドでのJS起床回数を抑える。
  deferredUpdatesInterval: LOCATION_TIME_INTERVAL,
  deferredUpdatesDistance: 0,
  pausesUpdatesAutomatically: false,
} as const;

// 省電力測位モード(実験的機能)。更新間隔は既定値と共通のまま、精度をBalancedへ
// 下げ、停車中の測位自動休止(iOSのみ)を追加で許可する。
export const LOCATION_TASK_OPTIONS_POWER_SAVING: Location.LocationTaskOptions =
  {
    ...LOCATION_TASK_OPTIONS,
    accuracy: LOCATION_ACCURACY_POWER_SAVING,
    // 停車中はiOSに測位ハードウェアの休止を許可し、移動再開時にOtherNavigationの
    // 活動種別を手掛かりとして自動再開させる。
    pausesUpdatesAutomatically: true,
  } as const;
