import * as Battery from 'expo-battery';
import type * as Location from 'expo-location';
import { useAtomValue } from 'jotai';
import { useMemo, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import {
  getMaxPermitAccuracy,
  subscribeRemoteConfig,
} from '~/lib/remoteConfig';
import { powerSavingLocationEnabledAtom } from '~/store/atoms/battery';
import {
  LOCATION_BACKGROUND_HEARTBEAT_START_DELAY,
  LOCATION_HEARTBEAT_MAX_PENDING,
  LOCATION_HEARTBEAT_STALE_THRESHOLD,
  LOCATION_TASK_OPTIONS,
  LOCATION_TASK_OPTIONS_POWER_SAVING,
  LOCATION_WATCH_OPTIONS,
  LOCATION_WATCH_OPTIONS_POWER_SAVING,
} from '../constants';

// expo-locationのiOSタスクはoptions辞書をそのままネイティブへ渡す。
// 保存済みの旧設定に関係なく、背景でも10mの距離制限を適用する。
// 独自キーはpatches/expo-location+58.0.16.patchで解釈する。
const IOS_TASK_OPTIONS_WITH_DISTANCE_FILTER: Location.LocationTaskOptions & {
  trainLCDBypassBackgroundDistanceFilter: boolean;
  trainLCDBackgroundHeartbeatInterval: number;
  trainLCDBackgroundHeartbeatTimeout: number;
  trainLCDBackgroundHeartbeatStartDelay: number;
} = {
  ...LOCATION_TASK_OPTIONS,
  trainLCDBypassBackgroundDistanceFilter: false,
  // 通常測位の10m制限を維持し、途絶時だけネイティブで補完します。
  trainLCDBackgroundHeartbeatInterval: LOCATION_HEARTBEAT_STALE_THRESHOLD,
  trainLCDBackgroundHeartbeatTimeout: LOCATION_HEARTBEAT_MAX_PENDING,
  trainLCDBackgroundHeartbeatStartDelay:
    LOCATION_BACKGROUND_HEARTBEAT_START_DELAY,
};

type LocationProfile = {
  /**
   * 省電力測位プロファイルが選ばれているか。「バッテリー」設定のトグルと端末の
   * 省電力モードのどちらかで真になる。プロファイルの中身だけでなくこの判定自体を
   * 参照する側があるため(補完測位は省電力中は動かない)、選択結果と一緒に返す。
   */
  powerSavingEnabled: boolean;
  watchOptions: Location.LocationOptions;
  taskOptions: Location.LocationTaskOptions;
};

/**
 * 継続測位のプロファイル(既定/省電力)を選ぶ。継続測位本体
 * (useStartBackgroundLocationUpdates)と、配信が途絶えたときの補完測位
 * (useLocationHeartbeat)の双方から参照する。
 *
 * 選択規則を各フックへ複製すると、省電力プロファイルの条件を変えたときに片方だけが
 * 旧規則のまま残り、省電力モード中に補完測位だけHigh精度で走る、といった食い違いが
 * 静かに生まれる。プロファイルの決定はこの1か所に集約する。
 *
 * watchOptionsはモジュール定数を使う。iOSの通常taskOptionsは許容精度を
 * 依存にメモ化し、許容精度が変わったときだけ呼び出し側の測位タスクを更新する。
 */
export const useLocationProfile = (): LocationProfile => {
  const systemLowPowerMode = Battery.useLowPowerMode();
  const maxAccuracy = useSyncExternalStore(
    subscribeRemoteConfig,
    getMaxPermitAccuracy,
    getMaxPermitAccuracy
  );
  // 許容精度の取得後もネイティブへ反映し、無関係な再レンダーでは参照を保つ。
  const iosTaskOptions = useMemo(
    () => ({
      ...IOS_TASK_OPTIONS_WITH_DISTANCE_FILTER,
      trainLCDBackgroundHeartbeatMaxAccuracy: maxAccuracy,
    }),
    [maxAccuracy]
  );
  // 省電力測位モード。精度をBalancedへ下げ、停車中の測位自動休止(iOSのみ)を
  // 許可する。通常測位の要求精度はOS別にconstants/location.tsで定義する。
  const powerSavingSettingEnabled = useAtomValue(
    powerSavingLocationEnabledAtom
  );
  // 「バッテリー」設定でONにしたときに加え、端末の省電力モード中も自動的に
  // 同じプロファイルへ切り替える。
  const powerSavingEnabled = powerSavingSettingEnabled || systemLowPowerMode;

  return {
    powerSavingEnabled,
    watchOptions: powerSavingEnabled
      ? LOCATION_WATCH_OPTIONS_POWER_SAVING
      : LOCATION_WATCH_OPTIONS,
    taskOptions: powerSavingEnabled
      ? LOCATION_TASK_OPTIONS_POWER_SAVING
      : Platform.OS === 'ios'
        ? iosTaskOptions
        : LOCATION_TASK_OPTIONS,
  };
};
